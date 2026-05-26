'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Block {
  id: string;
  type: string;
  content: Record<string, unknown>;
  order: number;
}

interface EditorContextType {
  blocks: Block[];
  setBlocks: (blocks: Block[]) => void;
  addBlock: (type: string, content: Record<string, unknown>) => void;
  updateBlock: (id: string, content: Record<string, unknown>) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (id: string, direction: 'up' | 'down') => void;
  isPreview: boolean;
  setIsPreview: (isPreview: boolean) => void;
  isExporting: boolean;
  setIsExporting: (isExporting: boolean) => void;
  lessonId?: string;
  courseId?: string;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ 
  children, 
  initialBlocks = [],
  initialIsPreview = false,
  lessonId,
  courseId,
}: { 
  children: React.ReactNode, 
  initialBlocks?: Block[],
  initialIsPreview?: boolean,
  lessonId?: string,
  courseId?: string,
}) {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks.sort((a, b) => a.order - b.order)
  );
  const [isPreview, setIsPreview] = useState(initialIsPreview);
  const [isExporting, setIsExporting] = useState(false);

  const addBlock = useCallback((type: string, content: Record<string, unknown>) => {
    setBlocks((prev) => {
      const newBlock: Block = { id: uuidv4(), type, content, order: prev.length };
      return [...prev, newBlock];
    });
  }, []);

  const updateBlock = useCallback((id: string, content: Record<string, unknown>) => {
    setBlocks((prev) => 
      prev.map((b) => (b.id === id ? { ...b, content: { ...b.content, ...content } } : b))
    );
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i })));
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    const original = blocks[index];
    const newBlock = { ...original, id: uuidv4(), order: index + 1 };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
  }, [blocks]);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
  }, [blocks]);

  return (
    <EditorContext.Provider value={{ 
      blocks, 
      setBlocks, 
      addBlock, 
      updateBlock, 
      removeBlock, 
      duplicateBlock,
      moveBlock,
      isPreview,
      setIsPreview,
      isExporting,
      setIsExporting,
      lessonId,
      courseId,
    }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
