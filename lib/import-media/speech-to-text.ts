import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { OLLAMA_STT_MODEL, STT_PROVIDER, FASTER_WHISPER_MODEL, FASTER_WHISPER_LANGUAGE } from './constants';

const execFileAsync = promisify(execFile);
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// ─── Provider abstraction ──────────────────────────────────────────────────────

export interface STTProvider {
  readonly providerName: string;
  readonly modelName: string;
  transcribeFile(filePath: string): Promise<string>;
}

// ─── Ollama Whisper implementation ─────────────────────────────────────────────

/**
 * Transcribes audio via Ollama's OpenAI-compatible /v1/audio/transcriptions
 * endpoint (multipart/form-data). This is the correct API for Whisper models
 * in Ollama. The old approach of passing base64 audio in the `images` field
 * of /api/generate was designed for vision models (llava) and causes Whisper
 * to reply "I don't see an image."
 *
 * Requires Ollama >= 0.6.0. Check `ollama --version` if this fails with 404.
 */
export class OllamaWhisperProvider implements STTProvider {
  readonly providerName = 'ollama-whisper';
  get modelName() { return OLLAMA_STT_MODEL; }

  async transcribeFile(filePath: string): Promise<string> {
    // ── Debug: file existence and size ───────────────────────────────────────
    if (!fs.existsSync(filePath)) {
      console.error(`[stt] File not found: ${filePath}`);
      throw new Error(`STT input file not found: ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    console.log(`[stt] transcribeFile model=${this.modelName} file=${path.basename(filePath)} size=${stat.size}B`);
    if (stat.size === 0) {
      throw new Error(`[stt] Audio file is empty: ${filePath}`);
    }

    // ── Build multipart form data ─────────────────────────────────────────────
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', blob, path.basename(filePath));
    formData.append('model', this.modelName);

    const endpoint = `${OLLAMA_BASE_URL}/v1/audio/transcriptions`;
    console.log(`[stt] POST ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(300_000),
    });

    const rawText = await response.text();
    console.log(`[stt] HTTP ${response.status} raw=${rawText.slice(0, 300)}`);

    if (!response.ok) {
      throw new Error(`Ollama STT error ${response.status}: ${rawText}`);
    }

    let data: { text?: string };
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`[stt] Failed to parse JSON from STT response: ${rawText.slice(0, 200)}`);
    }

    const text = (data.text ?? '').trim();
    console.log(`[stt] Transcript length=${text.length} preview="${text.slice(0, 120)}"`);
    return text;
  }
}

// ─── faster-whisper implementation ─────────────────────────────────────────────

/**
 * Transcribes audio using the Python faster-whisper package via subprocess.
 * Models are downloaded automatically from HuggingFace on first use.
 * Requires: pip install faster-whisper
 */
export class FasterWhisperProvider implements STTProvider {
  readonly providerName = 'faster-whisper';
  private readonly modelSize: string;
  private readonly language: string;

  get modelName() { return `faster-whisper:${this.modelSize}`; }

  constructor() {
    this.modelSize = FASTER_WHISPER_MODEL;
    this.language  = FASTER_WHISPER_LANGUAGE;
  }

  async transcribeFile(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`STT input file not found: ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    console.log(`[stt] faster-whisper model=${this.modelSize} lang=${this.language} file=${path.basename(filePath)} size=${stat.size}B`);
    if (stat.size === 0) {
      throw new Error(`[stt] Audio file is empty: ${filePath}`);
    }

    const scriptPath = path.join(process.cwd(), 'lib', 'import-media', 'transcribe.py');
    const args = [scriptPath, filePath, this.modelSize, this.language];

    const { stdout, stderr } = await execFileAsync('python', args, {
      timeout: 600_000,  // 10 minutes — first run downloads the model
    });

    if (stderr) {
      // stderr contains progress/debug logs from the script — log but don't fail
      console.log(`[stt] faster-whisper stderr: ${stderr.slice(0, 500)}`);
    }

    return stdout.trim();
  }
}

// ─── Service ───────────────────────────────────────────────────────────────────

/**
 * Heuristic check for LLM-style refusals that occur when the STT model is
 * actually a chat model and doesn't receive/process audio properly.
 * Whisper transcriptions never contain these English meta-phrases.
 */
function looksLikeModelRefusal(text: string): boolean {
  const lower = text.toLowerCase();
  const REFUSAL_PATTERNS = [
    "i don't see any audio",
    "no audio provided",
    "please provide the actual audio",
    "i'm unable to transcribe",
    "i cannot transcribe",
    "i don't have the ability to",
    "as an ai",
    "as a language model",
  ];
  return REFUSAL_PATTERNS.some(p => lower.includes(p));
}

export class SpeechToTextService {
  private readonly provider: STTProvider;

  constructor(provider?: STTProvider) {
    if (provider) {
      this.provider = provider;
    } else if (STT_PROVIDER === 'ollama') {
      this.provider = new OllamaWhisperProvider();
    } else {
      this.provider = new FasterWhisperProvider();
    }
  }

  get providerName() { return this.provider.providerName; }
  get modelName()    { return this.provider.modelName; }

  /** Transcribe a list of audio chunk files in order and merge the results. */
  async transcribeChunks(chunkPaths: string[]): Promise<string> {
    console.log(`[stt] transcribeChunks: ${chunkPaths.length} chunk(s), model=${this.modelName}`);
    const parts: string[] = [];
    for (let i = 0; i < chunkPaths.length; i++) {
      const filePath = chunkPaths[i];
      console.log(`[stt] Chunk ${i + 1}/${chunkPaths.length}: ${path.basename(filePath)}`);
      const text = await this.provider.transcribeFile(filePath);
      if (text) parts.push(text);
    }
    const merged = parts.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (looksLikeModelRefusal(merged)) {
      throw new Error(
        `음성 인식 모델(${this.modelName})이 오디오를 처리하지 못했습니다 — ` +
        `텍스트 응답이 반환되었습니다. STT_PROVIDER 환경변수를 확인하세요. ` +
        `모델 응답: "${merged.slice(0, 120)}"`,
      );
    }
    console.log(`[stt] Merged transcript: ${merged.length} chars`);
    return merged;
  }
}
