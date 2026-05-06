import fs from 'fs';
import path from 'path';
import { TEMP_BASE_DIR } from './constants';

export interface CleanupResult {
  success: boolean;
  /** Path that was deleted (or attempted). Never expose this in API responses. */
  deletedPath: string;
}

/**
 * Deletes the entire job-specific temp directory (source audio, normalized WAV,
 * and all chunk files). Called after successful transcription AND in finally
 * blocks to prevent orphaned temp files accumulating on disk.
 *
 * Internal paths are logged server-side only and MUST NOT appear in any API
 * response.
 */
export class AudioCleanupService {
  private readonly jobDir: string;

  constructor(jobId: string) {
    this.jobDir = path.join(TEMP_BASE_DIR, jobId);
  }

  async deleteAll(): Promise<CleanupResult> {
    if (!fs.existsSync(this.jobDir)) {
      return { success: true, deletedPath: this.jobDir };
    }
    try {
      fs.rmSync(this.jobDir, { recursive: true, force: true });
      return { success: true, deletedPath: this.jobDir };
    } catch (err) {
      // Log server-side; never expose path to clients.
      console.error('[audio-cleanup] Failed to delete job temp dir:', err);
      return { success: false, deletedPath: this.jobDir };
    }
  }
}
