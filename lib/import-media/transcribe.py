#!/usr/bin/env python3
"""
Audio transcription using faster-whisper.

Usage:
    python transcribe.py <audio_file> [model_size] [language]

Arguments:
    audio_file   Path to audio file (wav, mp3, m4a, etc.)
    model_size   Whisper model size: tiny / base / small / medium / large-v3
                 Defaults to "base". Models are downloaded automatically on first use
                 from HuggingFace into ~/.cache/huggingface/hub/.
    language     ISO language code, e.g. "zh" (Chinese), "ko" (Korean), "en" (English).
                 Omit or pass "auto" to let Whisper auto-detect the language.

Output:
    Prints transcription text to stdout. Errors go to stderr.
    Exit code 0 on success, non-zero on error.
"""
import sys
import os


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: transcribe.py <audio_file> [model_size] [language]",
            file=sys.stderr,
        )
        sys.exit(1)

    audio_file = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language_arg = sys.argv[3] if len(sys.argv) > 3 else "auto"
    language = None if language_arg in ("auto", "") else language_arg

    if not os.path.exists(audio_file):
        print(f"Error: audio file not found: {audio_file}", file=sys.stderr)
        sys.exit(1)

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            "Error: faster-whisper is not installed. Run: pip install faster-whisper",
            file=sys.stderr,
        )
        sys.exit(2)

    print(
        f"[transcribe.py] model={model_size} language={language or 'auto'} file={audio_file}",
        file=sys.stderr,
    )

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio_file,
        language=language,
        beam_size=5,
        vad_filter=True,
    )

    print(
        f"[transcribe.py] detected_language={info.language} probability={info.language_probability:.2f}",
        file=sys.stderr,
    )

    parts = []
    for segment in segments:
        text = segment.text.strip()
        if text:
            parts.append(text)

    result = " ".join(parts)
    print(result)


if __name__ == "__main__":
    main()
