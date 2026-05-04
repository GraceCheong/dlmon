'use client';

import React from 'react';
import TextBlock from './blocks/TextBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import VideoBlock from './blocks/VideoBlock';
import QuizBlock from './blocks/QuizBlock';
import TonePracticeBlock from './blocks/TonePracticeBlock';
import CharacterAnalysisBlock from './blocks/CharacterAnalysisBlock';
import CultureComparisonBlock from './blocks/CultureComparisonBlock';
import SubtitleAnalysisBlock from './blocks/SubtitleAnalysisBlock';
import TextAnalyzerBlock from './blocks/TextAnalyzerBlock';
import MediaImportBlock from './blocks/MediaImportBlock';

export const blockRegistry: Record<string, React.FC<any>> = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  video: VideoBlock,
  quiz: QuizBlock,
  'tone-practice': TonePracticeBlock,
  'char-analysis': CharacterAnalysisBlock,
  'culture-comparison': CultureComparisonBlock,
  'subtitle-analysis': SubtitleAnalysisBlock,
  'text-analyzer': TextAnalyzerBlock,
  'media-import': MediaImportBlock,
};

export function renderBlock(type: string, props: any) {
  const BlockComponent = blockRegistry[type];
  if (!BlockComponent) {
    return <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px' }}>Unknown block type: {type}</div>;
  }
  return <BlockComponent {...props} />;
}
