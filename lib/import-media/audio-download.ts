import fs from 'fs';
import path from 'path';
import { TEMP_BASE_DIR, MAX_AUDIO_DURATION_MINUTES, MAX_AUDIO_FILE_SIZE_MB } from './constants';
import type { AudioDownloadResult, ImportJobLimits } from './types';
import { execYtDlp, formatYtDlpCommand } from './yt-dlp';

export async function downloadYouTubeAudio(
  url: string,
  jobId: string,
  limits?: ImportJobLimits | null,
): Promise<AudioDownloadResult> {
  const jobDir = path.join(TEMP_BASE_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const maxDurationMin = limits?.maxAudioDurationMinutes ?? MAX_AUDIO_DURATION_MINUTES;
  const maxSizeMb = MAX_AUDIO_FILE_SIZE_MB;
  const outputTemplate = path.join(jobDir, 'source.%(ext)s');

  // WAV is required for ffmpeg normalization downstream.
  // max-filesize is a rough guard; ffmpeg will do precise duration trimming if needed.
  const args = [
    '--extract-audio',
    '--audio-format',
    'wav',
    '--audio-quality',
    '0',
    '--no-playlist',
    '--max-filesize',
    `${maxSizeMb}M`,
    '-o',
    outputTemplate,
    url,
  ];

  console.log(`[audio-download] cmd: ${formatYtDlpCommand(args)}`);
  try {
    const { stdout, stderr } = await execYtDlp(args, { timeout: (maxDurationMin + 5) * 60_000 });
    if (stdout) console.log(`[audio-download] stdout: ${stdout.slice(0, 500)}`);
    if (stderr) console.log(`[audio-download] stderr: ${stderr.slice(0, 500)}`);
  } catch (err) {
    console.error(`[audio-download] yt-dlp failed:`, err instanceof Error ? err.message : String(err));
    throw new Error(
      `오디오 다운로드 실패. yt-dlp 또는 python -m yt_dlp 실행 가능 여부를 확인하세요: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // Find the downloaded file (extension might vary)
  const files = fs.readdirSync(jobDir).filter(f => f.startsWith('source.'));
  if (!files.length) throw new Error('다운로드된 오디오 파일을 찾을 수 없습니다.');

  const filePath = path.join(jobDir, files[0]);
  const stat = fs.statSync(filePath);
  console.log(`[audio-download] saved: ${filePath} (${stat.size}B)`);

  return {
    filePath,
    fileSizeBytes: stat.size,
  };
}
