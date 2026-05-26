import { execFile, type ExecFileOptions } from 'child_process';

type ExecResult = {
  stdout: string;
  stderr: string;
};

type YtDlpCandidate = {
  file: string;
  prefixArgs: string[];
  label: string;
};

const configuredYtDlpPath = process.env.YT_DLP_PATH || process.env.YT_DLP_BIN;

const YT_DLP_CANDIDATES: YtDlpCandidate[] = [
  ...(configuredYtDlpPath
    ? [{ file: configuredYtDlpPath, prefixArgs: [], label: configuredYtDlpPath }]
    : []),
  { file: 'python', prefixArgs: ['-m', 'yt_dlp'], label: 'python -m yt_dlp' },
  { file: 'py', prefixArgs: ['-m', 'yt_dlp'], label: 'py -m yt_dlp' },
  { file: 'yt-dlp', prefixArgs: [], label: 'yt-dlp' },
];

function execFileAsync(file: string, args: string[], options: ExecFileOptions): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { encoding: 'utf8', windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        stdout: String(stdout ?? ''),
        stderr: String(stderr ?? ''),
      });
    });
  });
}

function quoteForLog(value: string): string {
  if (!/[\s"]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function summarizeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function formatYtDlpCommand(args: string[]): string {
  const candidate = YT_DLP_CANDIDATES[0];
  return [candidate.label, ...args].map(quoteForLog).join(' ');
}

export async function execYtDlp(args: string[], options: ExecFileOptions = {}): Promise<ExecResult> {
  const attempts: string[] = [];

  for (const candidate of YT_DLP_CANDIDATES) {
    try {
      return await execFileAsync(candidate.file, [...candidate.prefixArgs, ...args], {
        maxBuffer: 10 * 1024 * 1024,
        ...options,
      });
    } catch (err) {
      attempts.push(`${candidate.label}: ${summarizeError(err)}`);
    }
  }

  throw new Error(
    `yt-dlp 실행 실패. YT_DLP_PATH를 설정하거나 Python 패키지 yt-dlp를 설치하세요. 시도한 명령: ${attempts.join(' | ')}`,
  );
}
