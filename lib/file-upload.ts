import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const ALLOWED_TYPES = ['pdf', 'hwp', 'hwpx'] as const;
export type AllowedFileType = (typeof ALLOWED_TYPES)[number];

export function detectFileType(filename: string): AllowedFileType | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'hwp') return 'hwp';
  if (ext === 'hwpx') return 'hwpx';
  return null;
}

export async function ensureUploadsDir(): Promise<void> {
  if (!existsSync(UPLOADS_DIR)) {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export function buildStoragePath(fileId: string, ext: string): string {
  return path.join(UPLOADS_DIR, `${fileId}.${ext}`);
}

export function buildConvertedPath(fileId: string): string {
  return path.join(UPLOADS_DIR, `${fileId}_converted.pdf`);
}

/**
 * Converts HWP/HWPX to PDF using LibreOffice headless.
 * Returns the output PDF path on success, or throws on failure.
 * Requires `soffice` to be on PATH (LibreOffice).
 */
export async function convertToPdf(inputPath: string, outputDir: string): Promise<string> {
  const basename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${basename}.pdf`);

  await execFileAsync('soffice', [
    '--headless',
    '--convert-to', 'pdf',
    '--outdir', outputDir,
    inputPath,
  ], { timeout: 60_000 });

  return outputPath;
}

export async function isLibreOfficeAvailable(): Promise<boolean> {
  try {
    await execFileAsync('soffice', ['--version'], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}
