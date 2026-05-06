'use client';

import React from 'react';
import TextBlock from './blocks/TextBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import VideoBlock from './blocks/VideoBlock';
import QuizBlock from './blocks/QuizBlock';
import TextAnalyzerBlock from './blocks/TextAnalyzerBlock';
import MediaImportBlock from './blocks/MediaImportBlock';
import YouTubeLinkBlock from './blocks/YouTubeLinkBlock';

/**
 * Active block registry.
 *
 * Removed (Phase 3, 2026-05-01):
 *   - tone-practice (성조 연습)
 *   - char-analysis (한자 분석)
 *   - culture-comparison (문화 비교)
 *   - subtitle-analysis (영상 자막 분석) — merged into youtube-extract
 *
 * Renamed (back-compat alias retained):
 *   - media-import → youtube-extract  (label: 유튜브 미디어 추출)
 *
 * Old saved LessonBlock rows with type='media-import' will still render via the
 * `media-import` alias. New blocks use `youtube-extract`. A one-time SQL
 * cleanup is documented in PROJECT_SUMMARY.md if you want to drop the alias.
 */
export const blockRegistry: Record<string, React.FC<any>> = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  video: VideoBlock,
  quiz: QuizBlock,
  'text-analyzer': TextAnalyzerBlock,
  'youtube-extract': MediaImportBlock,
  'youtube-link': YouTubeLinkBlock,
  // Back-compat alias for previously saved blocks. Remove once data migrated.
  'media-import': MediaImportBlock,
};

export function renderBlock(type: string, props: any) {
  const BlockComponent = blockRegistry[type];
  if (!BlockComponent) {
    return (
      <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px' }}>
        Unknown block type: {type}
      </div>
    );
  }
  return <BlockComponent {...props} />;
}
