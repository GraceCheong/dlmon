import path from 'path';

export const TEMP_BASE_DIR = path.resolve(
  process.env.IMPORT_MEDIA_TEMP_DIR || './tmp/import-media',
);

export const MAX_AUDIO_DURATION_MINUTES = parseInt(
  process.env.IMPORT_MEDIA_MAX_AUDIO_DURATION_MINUTES || '60',
  10,
);

export const AUDIO_CHUNK_SECONDS = parseInt(
  process.env.IMPORT_MEDIA_AUDIO_CHUNK_SECONDS || '300',
  10,
);

export const MAX_AUDIO_FILE_SIZE_MB = parseInt(
  process.env.IMPORT_MEDIA_MAX_AUDIO_FILE_SIZE_MB || '200',
  10,
);

export const DELETE_AUDIO_AFTER_SUCCESS =
  process.env.IMPORT_MEDIA_DELETE_AUDIO_AFTER_SUCCESS !== 'false';

export const RETAIN_AUDIO_ON_FAILURE =
  process.env.IMPORT_MEDIA_RETAIN_AUDIO_ON_FAILURE === 'true';

export const OLLAMA_STT_MODEL =
  process.env.OLLAMA_STT_MODEL || 'karanchopda333/whisper:latest';
