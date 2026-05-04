import { NextResponse } from 'next/server';
import { ollamaGenerate, parseOllamaJSON, MODELS } from '@/lib/ollama';
import { isYouTubeUrl, isVideoUrl, downloadYouTubeAudio, getVideoMetadata } from '@/lib/youtube';
import fs from 'fs';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const isYT = isYouTubeUrl(url);
    const isVideo = isVideoUrl(url);

    // --- YouTube Pipeline ---
    if (isYT) {
      // Step 1: Get metadata
      const { title } = await getVideoMetadata(url);

      // Step 2: Download audio
      let audioPath: string | null = null;
      try {
        audioPath = await downloadYouTubeAudio(url);
      } catch (dlErr) {
        console.error('Audio download failed:', dlErr);
        return NextResponse.json({
          error: `영상 다운로드에 실패했습니다. yt-dlp 설치를 확인해 주세요: ${(dlErr as Error).message}`,
        }, { status: 500 });
      }

      // Step 3: Transcribe with Ollama Whisper
      let transcriptText = "";
      try {
        const audioBuffer = fs.readFileSync(audioPath!);
        const base64Audio = audioBuffer.toString('base64');
        
        const whisperResult = await ollamaGenerate({
          model: 'karanchopda333/whisper:latest',
          prompt: "Transcribe the following audio precisely.",
          images: [base64Audio], // Audio passed in images field for this whisper implementation
        });
        transcriptText = whisperResult.trim();
        console.log('Transcription successful:', transcriptText.substring(0, 50) + '...');
      } catch (e) {
        console.error('Ollama Whisper transcription failed:', e);
        transcriptText = `[영상: ${title}] — 음성 인식 중 오류가 발생했습니다. 대신 제목을 기반으로 내용을 구성합니다.`;
      }

      // Step 4: Generate educational content from the actual transcript
      const contentPrompt = `당신은 중국어 교육 전문가입니다. 아래는 유튜브 영상의 실제 음성 인식 결과(전사본)입니다. 이 내용을 바탕으로 강의 자료를 정제하고, 핵심 어휘와 이해 확인 질문을 작성해 주세요.
      
영상 제목: "${title}"
영상 전사본: ${JSON.stringify(transcriptText || title)}

JSON 형식으로만 응답하세요:
{
  "rawTranscript": ${JSON.stringify(transcriptText)},
  "lectureText": "정제된 강의 적합 텍스트 (단락 구분 포함)",
  "keyVocabulary": [
    {"word": "단어", "pinyin": "병음", "meaning": "한국어 뜻"}
  ],
  "comprehensionQuestions": [
    {"question": "이해 확인 질문", "answer": "정답"}
  ]
}`;

      let transcriptData = {
        rawTranscript: transcriptText,
        lectureText: '',
        keyVocabulary: [] as Array<{ word: string; pinyin: string; meaning: string }>,
        comprehensionQuestions: [] as Array<{ question: string; answer: string }>,
      };

      try {
        const ollamaResult = await ollamaGenerate({
          model: MODELS.fast,
          prompt: contentPrompt,
          temperature: 0.7,
          jsonMode: true,
        });
        transcriptData = parseOllamaJSON(ollamaResult);
      } catch (e) {
        console.error('Ollama educational content generation failed:', e);
        transcriptData.lectureText = transcriptText;
      }

      // Cleanup temp file
      if (audioPath && fs.existsSync(audioPath)) {
        try { fs.unlinkSync(audioPath); } catch { /* ignore */ }
      }

      return NextResponse.json({
        sourceType: 'video',
        title: title || '유튜브 영상',
        url,
        transcript: transcriptData.rawTranscript,
        lectureText: transcriptData.lectureText,
        keyVocabulary: transcriptData.keyVocabulary,
        comprehensionQuestions: transcriptData.comprehensionQuestions,
      });
    }

    // --- Non-YouTube / Social Media ---
    const contentPrompt = `당신은 중국어 교육 전문가입니다. 아래 URL의 소셜 미디어 콘텐츠(위챗 대화, 웨이보 포스트, 더우인 자막 등)를 분석하여 중국어 수업 자료로 변환해 주세요.

URL: ${url}

JSON 형식으로만 응답하세요:
{
  "rawTranscript": "원문 중국어 텍스트",
  "lectureText": "강의 적합 정제 텍스트",
  "keyVocabulary": [
    {"word": "단어", "pinyin": "병음", "meaning": "한국어 뜻"}
  ]
}`;

    let result = { rawTranscript: '', lectureText: '', keyVocabulary: [] as Array<{ word: string; pinyin: string; meaning: string }> };
    try {
      const ollamaResult = await ollamaGenerate({
        model: MODELS.fast,
        prompt: contentPrompt,
        temperature: 0.7,
        jsonMode: true,
      });
      result = parseOllamaJSON(ollamaResult);
    } catch (e) {
      console.error('Ollama content analysis failed:', e);
    }

    return NextResponse.json({
      sourceType: 'image/social',
      title: '소셜 미디어 콘텐츠',
      url,
      transcript: result.rawTranscript,
      lectureText: result.lectureText,
      keyVocabulary: result.keyVocabulary,
    });

  } catch (error) {
    console.error('Media Import Error:', error);
    return NextResponse.json({ error: `미디어 추출에 실패했습니다: ${(error as Error).message}` }, { status: 500 });
  }
}
