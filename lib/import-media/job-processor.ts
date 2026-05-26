/**
 * Job processor — orchestrates all import-media services in sequence.
 * Runs in the background via Next.js after() after the POST response is sent.
 *
 * Audio cleanup rules:
 *  - On success:  delete immediately after transcription (IMPORT_MEDIA_DELETE_AUDIO_AFTER_SUCCESS).
 *  - On failure:  delete in the finally block, UNLESS IMPORT_MEDIA_RETAIN_AUDIO_ON_FAILURE=true.
 *  - The finally block always runs as a safety net against orphaned temp files.
 */

import prisma from '@/lib/prisma';
import { fetchYouTubeMetadata } from './youtube-metadata';
import { fetchYouTubeTranscript } from './youtube-transcript';
import { downloadYouTubeAudio } from './audio-download';
import { processAudio } from './audio-processing';
import { AudioCleanupService } from './audio-cleanup';
import { SpeechToTextService } from './speech-to-text';
import { generateImportedContent } from './ai-content';
import { DELETE_AUDIO_AFTER_SUCCESS, RETAIN_AUDIO_ON_FAILURE } from './constants';
import type { TranscriptPolicy, OutputOptions, ImportJobLimits, TargetAudience, HskLevel } from './types';

async function setStatus(jobId: string, status: string) {
  await prisma.mediaImportJob.update({ where: { id: jobId }, data: { status } });
}

async function fail(jobId: string, message: string, errorCode?: string) {
  await prisma.mediaImportJob.update({
    where: { id: jobId },
    data: { status: 'failed', jobError: message, errorCode: errorCode ?? null, completedAt: new Date() },
  }).catch(console.error);
}

export async function processImportJob(jobId: string): Promise<void> {
  const cleanup = new AudioCleanupService(jobId);
  let audioDownloaded = false;

  try {
    const job = await prisma.mediaImportJob.findUnique({ where: { id: jobId } });
    if (!job) { console.error(`[job-processor] Job ${jobId} not found`); return; }

    const transcriptPolicy: TranscriptPolicy = job.transcriptPolicy
      ? JSON.parse(job.transcriptPolicy)
      : { preferYouTubeCaption: true, allowAudioDownloadFallback: true, allowManualTranscriptFallback: false };

    const outputOptions: OutputOptions = job.outputOptions
      ? JSON.parse(job.outputOptions)
      : { includeSummary: true, includeVocabulary: true, includeExpressions: true, includeGrammarPoints: true, includeComprehensionQuestions: true, includeDiscussionQuestions: true, includeWritingPrompt: true, includeLessonActivities: true };

    const limits: ImportJobLimits | null = job.limits ? JSON.parse(job.limits) : null;

    console.log(`[job-processor] START jobId=${jobId} url=${job.sourceUrl}`);
    console.log(`[job-processor] transcriptPolicy=${JSON.stringify(transcriptPolicy)}`);

    // ── 1. Fetch metadata ────────────────────────────────────────────────────
    await setStatus(jobId, 'fetching_metadata');
    console.log(`[job-processor] [1] fetching metadata`);
    const metadata = await fetchYouTubeMetadata(job.sourceUrl);
    console.log(`[job-processor] metadata: title="${metadata.title}" duration=${metadata.durationSeconds}s`);
    await prisma.mediaImportJob.update({
      where: { id: jobId },
      data: {
        videoId: metadata.videoId ?? null,
        videoTitle: metadata.title ?? null,
        channelName: metadata.channelName ?? null,
        durationSeconds: metadata.durationSeconds ?? null,
        thumbnailUrl: metadata.thumbnailUrl ?? null,
      },
    });

    // ── 2. Try YouTube captions first ────────────────────────────────────────
    let transcriptText = '';
    let transcriptSource = '';

    if (transcriptPolicy.preferYouTubeCaption) {
      await setStatus(jobId, 'fetching_transcript');
      console.log(`[job-processor] [2] fetching YouTube captions`);
      const captionResult = await fetchYouTubeTranscript(job.sourceUrl, jobId);
      if (captionResult.available) {
        console.log(`[job-processor] caption available source=${captionResult.source}`);
      } else {
        console.log(`[job-processor] caption unavailable reason=${captionResult.reason}`);
      }

      if (captionResult.available) {
        transcriptText = captionResult.text;
        transcriptSource = captionResult.source;
        console.log(`[job-processor] caption text length=${transcriptText.length}`);
        await prisma.mediaImportJob.update({
          where: { id: jobId },
          data: { transcriptText, transcriptSource, transcriptStatus: 'fetched', audioStatus: 'not_needed' },
        });
      } else if (!transcriptPolicy.allowAudioDownloadFallback) {
        await prisma.mediaImportJob.update({
          where: { id: jobId },
          data: { transcriptStatus: 'unavailable', jobError: captionResult.reason },
        });
        await setStatus(jobId, 'transcript_unavailable');
        return; // nothing more we can do
      }
    }

    // ── 3. Audio download fallback ───────────────────────────────────────────
    if (!transcriptText && transcriptPolicy.allowAudioDownloadFallback) {
      await setStatus(jobId, 'downloading_audio');
      console.log(`[job-processor] [3] no captions — falling back to audio download`);
      const downloadResult = await downloadYouTubeAudio(job.sourceUrl, jobId, limits);
      audioDownloaded = true;
      await prisma.mediaImportJob.update({
        where: { id: jobId },
        data: {
          audioStatus: 'downloaded',
          audioSizeBytes: downloadResult.fileSizeBytes ?? null,
          // audioStoragePath stored internally — NEVER returned to frontend
          audioStoragePath: downloadResult.filePath,
        },
      });

      // ── 4. Preprocess audio ────────────────────────────────────────────────
      await setStatus(jobId, 'preprocessing_audio');
      console.log(`[job-processor] [4] preprocessing audio`);
      const processResult = await processAudio(downloadResult.filePath, jobId);
      await prisma.mediaImportJob.update({
        where: { id: jobId },
        data: { audioStatus: 'processing' },
      });

      // ── 5. Transcribe ──────────────────────────────────────────────────────
      await setStatus(jobId, 'transcribing_audio');
      console.log(`[job-processor] [5] transcribing ${processResult.chunkPaths.length} chunk(s)`);
      const stt = new SpeechToTextService();
      console.log(`[job-processor] STT provider=${stt.providerName} model=${stt.modelName}`);
      transcriptText = await stt.transcribeChunks(processResult.chunkPaths);
      console.log(`[job-processor] transcript length=${transcriptText.length}`);
      transcriptSource = 'whisper';
      await prisma.mediaImportJob.update({
        where: { id: jobId },
        data: {
          transcriptText,
          transcriptSource,
          transcriptStatus: 'fetched',
          audioStatus: 'transcribed',
          sttProvider: stt.providerName,
          sttModel: stt.modelName,
        },
      });

      // ── 6. Delete audio immediately after successful transcription ─────────
      if (DELETE_AUDIO_AFTER_SUCCESS) {
        const cleanupResult = await cleanup.deleteAll();
        await prisma.mediaImportJob.update({
          where: { id: jobId },
          data: {
            audioStatus: 'deleted',
            audioDeletedAt: new Date(),
            // Clear internal path once deleted
            audioStoragePath: cleanupResult.success ? null : undefined,
          },
        });
        audioDownloaded = false; // already cleaned up
      }
    }

    if (!transcriptText.trim()) {
      await fail(jobId, '스크립트를 가져올 수 없습니다. 자막이 없고 오디오 다운로드도 허용되지 않았습니다.');
      return;
    }

    // ── 7. Normalize transcript (status marker) ──────────────────────────────
    await setStatus(jobId, 'normalizing_transcript');

    // ── 8. Generate AI content ───────────────────────────────────────────────
    await setStatus(jobId, 'generating_ai_result');
    const aiContentResult = await generateImportedContent({
      transcriptText,
      transcriptSource,
      videoTitle: metadata.title,
      channelName: metadata.channelName,
      durationSeconds: metadata.durationSeconds,
      originalUrl: metadata.originalUrl,
      targetAudience: (job.targetAudience ?? 'adult') as TargetAudience,
      hskLevel: (job.hskLevel ?? undefined) as HskLevel | undefined,
      outputOptions,
    });

    // ── 9. Validate + store ──────────────────────────────────────────────────
    await setStatus(jobId, 'validating_output');
    await prisma.mediaImportJob.update({
      where: { id: jobId },
      data: {
        aiResult: JSON.stringify(aiContentResult.result),
        aiRawResponse: aiContentResult.rawResponse.slice(0, 8000), // cap raw storage
        aiProvider: aiContentResult.provider,
        aiModel: aiContentResult.model,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    console.log(`[job-processor] COMPLETED jobId=${jobId}`);

  } catch (error) {
    let msg = error instanceof Error ? error.message : String(error);
    // Translate opaque network errors into actionable messages
    if (
      msg === 'fetch failed' ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('connect ETIMEDOUT')
    ) {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      msg = `AI 서버(Ollama)에 연결할 수 없습니다. Ollama가 실행 중인지 확인하세요: ${ollamaUrl}`;
    }
    console.error(`[job-processor] FAILED jobId=${jobId}:`, msg);
    await fail(jobId, msg);
  } finally {
    // Safety net: delete audio unless we already deleted it or debug retention is on
    if (audioDownloaded && !RETAIN_AUDIO_ON_FAILURE) {
      const result = await cleanup.deleteAll();
      if (result.success) {
        await prisma.mediaImportJob.update({
          where: { id: jobId },
          data: { audioStatus: 'deleted', audioDeletedAt: new Date(), audioStoragePath: null },
        }).catch(console.error);
      }
    }
  }
}
