import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { isYouTubeUrl } from '@/lib/youtube';
import { isYouTubeUrl as isYTUrl } from '@/lib/import-media/youtube-metadata';
import { fetchYouTubeMetadata } from '@/lib/import-media/youtube-metadata';
import { fetchYouTubeTranscript } from '@/lib/import-media/youtube-transcript';
import { downloadYouTubeAudio } from '@/lib/import-media/audio-download';
import { processAudio } from '@/lib/import-media/audio-processing';
import { AudioCleanupService } from '@/lib/import-media/audio-cleanup';
import { SpeechToTextService } from '@/lib/import-media/speech-to-text';
import { generateImportedContent } from '@/lib/import-media/ai-content';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { processImportJob } from '@/lib/import-media/job-processor';
import type { CreateImportJobRequest } from '@/lib/import-media/types';

// Node.js runtime required: yt-dlp (child_process), fs, path
export const runtime = 'nodejs';

// ─── New async job endpoint ────────────────────────────────────────────────────

async function handleNewJobRequest(
  body: CreateImportJobRequest,
  userId: string,
): Promise<NextResponse> {
  const { sourceType, url, targetAudience, hskLevel, transcriptPolicy, outputOptions, limits } = body;

  if (sourceType !== 'youtube') {
    return NextResponse.json({ error: 'sourceType must be "youtube"' }, { status: 400 });
  }
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: '`url` is required' }, { status: 400 });
  }
  if (!isYTUrl(url)) {
    return NextResponse.json({ error: '유효한 YouTube URL이 아닙니다.' }, { status: 400 });
  }
  if (!targetAudience) {
    return NextResponse.json({ error: '`targetAudience` is required' }, { status: 400 });
  }

  const job = await prisma.mediaImportJob.create({
    data: {
      userId,
      status: 'queued',
      sourceType,
      sourceUrl: url,
      targetAudience,
      hskLevel: hskLevel ?? null,
      transcriptPolicy: JSON.stringify(
        transcriptPolicy ?? {
          preferYouTubeCaption: true,
          allowAudioDownloadFallback: true,
          allowManualTranscriptFallback: false,
        },
      ),
      outputOptions: JSON.stringify(
        outputOptions ?? {
          includeSummary: true,
          includeVocabulary: true,
          includeExpressions: true,
          includeGrammarPoints: true,
          includeComprehensionQuestions: true,
          includeDiscussionQuestions: true,
          includeWritingPrompt: true,
          includeLessonActivities: true,
        },
      ),
      limits: limits ? JSON.stringify(limits) : null,
    },
  });

  // Kick off background processing after the response is sent.
  after(async () => {
    try {
      await processImportJob(job.id);
    } catch (err) {
      console.error(`[import-media] Unhandled error in job ${job.id}:`, err);
    }
  });

  return NextResponse.json({ importJobId: job.id, status: 'queued' }, { status: 202 });
}

// ─── Legacy synchronous endpoint (backward-compat for MediaImportBlock) ────────
//
// Uses the same lib/import-media/* pipeline as the async job processor:
//   1. Fetch video metadata
//   2. Try YouTube captions first
//   3. If no captions: download WAV audio → normalize → chunk → STT via Ollama Whisper
//   4. Generate structured Chinese learning content from transcript
//   5. Return legacy-compatible response shape expected by MediaImportBlock
//
// Error codes:
//   YOUTUBE_AUDIO_DOWNLOAD_FAILED  — yt-dlp failed or file is missing/empty
//   AUDIO_FILE_MISSING_OR_EMPTY    — file created but size is 0
//   TRANSCRIPTION_FAILED           — STT model returned empty or no usable text
//   IMPORT_FAILED                  — any other error in the pipeline

async function handleLegacyRequest(url: string): Promise<NextResponse> {
  if (!isYouTubeUrl(url)) {
    // Non-YouTube URLs are not supported in the legacy block.
    return NextResponse.json(
      { error: 'UNSUPPORTED_URL', message: 'YouTube URL만 지원됩니다.' },
      { status: 400 },
    );
  }

  const tempJobId = `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanup = new AudioCleanupService(tempJobId);

  try {
    // ── 1. Metadata ────────────────────────────────────────────────────────────
    console.log(`[legacy] [1] fetching metadata for ${url}`);
    const metadata = await fetchYouTubeMetadata(url);
    console.log(`[legacy] metadata: title="${metadata.title}" duration=${metadata.durationSeconds}s`);

    // ── 2. Try YouTube captions ────────────────────────────────────────────────
    console.log(`[legacy] [2] fetching YouTube captions`);
    const captionResult = await fetchYouTubeTranscript(url, tempJobId);

    let transcriptText = '';
    let transcriptSource = '';

    if (captionResult.available) {
      transcriptText = captionResult.text;
      transcriptSource = captionResult.source;
      console.log(`[legacy] captions available, source=${transcriptSource} length=${transcriptText.length}`);
    } else {
      console.log(`[legacy] no captions (${captionResult.reason}) — falling back to audio download`);

      // ── 3. Download audio ──────────────────────────────────────────────────
      console.log(`[legacy] [3] downloading audio`);
      let downloadResult;
      try {
        downloadResult = await downloadYouTubeAudio(url, tempJobId, null);
      } catch (dlErr) {
        const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
        console.error(`[legacy] audio download failed: ${msg}`);
        return NextResponse.json(
          { error: 'YOUTUBE_AUDIO_DOWNLOAD_FAILED', message: `유튜브 오디오를 다운로드할 수 없습니다: ${msg}` },
          { status: 500 },
        );
      }

      // ── 4. Verify file ─────────────────────────────────────────────────────
      if (!downloadResult.fileSizeBytes || downloadResult.fileSizeBytes === 0) {
        console.error(`[legacy] audio file missing or empty: ${downloadResult.filePath}`);
        await cleanup.deleteAll();
        return NextResponse.json(
          { error: 'AUDIO_FILE_MISSING_OR_EMPTY', message: '오디오 파일이 생성되지 않았거나 크기가 0입니다.' },
          { status: 500 },
        );
      }
      console.log(`[legacy] audio downloaded: ${downloadResult.fileSizeBytes}B`);

      // ── 5. Normalize + chunk ───────────────────────────────────────────────
      console.log(`[legacy] [4] normalizing and chunking audio`);
      const processResult = await processAudio(downloadResult.filePath, tempJobId);
      console.log(`[legacy] chunks: ${processResult.chunkPaths.length}`);

      // ── 6. Transcribe ──────────────────────────────────────────────────────
      console.log(`[legacy] [5] transcribing audio`);
      const stt = new SpeechToTextService();
      console.log(`[legacy] STT provider=${stt.providerName} model=${stt.modelName}`);
      try {
        transcriptText = await stt.transcribeChunks(processResult.chunkPaths);
      } catch (sttErr) {
        const msg = sttErr instanceof Error ? sttErr.message : String(sttErr);
        console.error(`[legacy] STT failed: ${msg}`);
        await cleanup.deleteAll();
        return NextResponse.json(
          { error: 'TRANSCRIPTION_FAILED', message: `음성 인식에 실패했습니다. STT 모델 설정을 확인하세요: ${msg}` },
          { status: 500 },
        );
      }
      transcriptSource = 'whisper';
      console.log(`[legacy] transcript length=${transcriptText.length}`);

      // ── 7. Delete audio immediately after successful transcription ─────────
      console.log(`[legacy] [6] cleaning up audio files`);
      await cleanup.deleteAll();
      console.log(`[legacy] audio cleanup complete`);

      if (!transcriptText.trim()) {
        return NextResponse.json(
          { error: 'TRANSCRIPTION_FAILED', message: '음성 인식 결과가 비어 있습니다. STT 모델이 오디오를 지원하는지 확인하세요.' },
          { status: 500 },
        );
      }
    }

    // ── 8. Generate structured content from transcript ─────────────────────────
    console.log(`[legacy] [7] generating AI content (transcript source=${transcriptSource})`);
    const contentResult = await generateImportedContent({
      transcriptText,
      transcriptSource,
      videoTitle: metadata.title,
      channelName: metadata.channelName,
      durationSeconds: metadata.durationSeconds,
      originalUrl: metadata.originalUrl,
      targetAudience: 'adult',
      outputOptions: {
        includeSummary: true,
        includeVocabulary: true,
        includeExpressions: false,
        includeGrammarPoints: false,
        includeComprehensionQuestions: true,
        includeDiscussionQuestions: false,
        includeWritingPrompt: false,
        includeLessonActivities: false,
      },
    });
    console.log(`[legacy] AI content generated`);

    // ── 9. Map to legacy response format expected by MediaImportBlock ──────────
    const aiResult = contentResult.result;
    return NextResponse.json({
      sourceType: 'video',
      title: aiResult.title || metadata.title || '유튜브 영상',
      url,
      transcript: transcriptText,
      lectureText: aiResult.sourceSummary?.detailedSummaryKo ?? '',
      keyVocabulary: (aiResult.chineseLearningContent?.vocabulary ?? []).map(v => ({
        word: v.word,
        pinyin: v.pinyin,
        meaning: v.meaning,
      })),
      comprehensionQuestions: (aiResult.classroomMaterials?.comprehensionQuestions ?? []).map(q => ({
        question: q.question,
        answer: q.answer,
      })),
    });

  } catch (error) {
    await cleanup.deleteAll().catch(console.error);
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[legacy] FAILED: ${msg}`);
    return NextResponse.json(
      { error: 'IMPORT_FAILED', message: `미디어 추출에 실패했습니다: ${msg}` },
      { status: 500 },
    );
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // New async job format: body contains sourceType
    if (body && typeof body.sourceType === 'string') {
      const auth = await requireUserOrUnauthorized();
      if (auth instanceof NextResponse) return auth;
      return handleNewJobRequest(body as CreateImportJobRequest, auth);
    }

    // Legacy synchronous format: body contains only url
    const { url } = body ?? {};
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    return handleLegacyRequest(url);

  } catch (error) {
    console.error('Media Import Error:', error);
    return NextResponse.json(
      { error: 'IMPORT_FAILED', message: `미디어 추출에 실패했습니다: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
