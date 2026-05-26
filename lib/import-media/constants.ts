import path from 'path';

const configuredTempDir = process.env.IMPORT_MEDIA_TEMP_DIR;

export const TEMP_BASE_DIR = configuredTempDir
  ? path.resolve(/* turbopackIgnore: true */ configuredTempDir)
  : path.join(process.cwd(), 'tmp', 'import-media');

export const MAX_AUDIO_DURATION_MINUTES = parseInt(
  process.env.IMPORT_MEDIA_MAX_AUDIO_DURATION_MINUTES || '10',
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
  process.env.OLLAMA_STT_MODEL || 'whisper';

// ─── STT provider selection ────────────────────────────────────────────────────
// 'faster-whisper' (default) — Python subprocess using faster-whisper package
// 'ollama'                   — Ollama /v1/audio/transcriptions endpoint (requires
//                              a proper Whisper GGUF model installed in Ollama)
export const STT_PROVIDER =
  process.env.STT_PROVIDER || 'faster-whisper';

// faster-whisper model size: tiny (39 MB) | base (74 MB) | small (244 MB)
//                            medium (769 MB) | large-v3 (1.5 GB)
// Models are downloaded automatically from HuggingFace on first use.
export const FASTER_WHISPER_MODEL =
  process.env.FASTER_WHISPER_MODEL || 'base';

// ISO language code passed to faster-whisper ('zh', 'ko', 'en', ...).
// Set to 'auto' or leave empty to let Whisper auto-detect the language.
export const FASTER_WHISPER_LANGUAGE =
  process.env.FASTER_WHISPER_LANGUAGE || 'zh';
