import { createOpenAI } from '@ai-sdk/openai';

// Configure the client to connect to a local LLM endpoint by default.
// This is typically Ollama (http://localhost:11434/v1) or LM Studio (http://localhost:1234/v1).
// To switch to the real OpenAI API later, simply remove the baseURL and provide a real API key.
const localUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1';

export const aiClient = createOpenAI({
  baseURL: localUrl,
  apiKey: process.env.OPENAI_API_KEY || 'local-dummy-key', // Local endpoints usually ignore this
});

// Helper to get the default model string.
// For Ollama, this might be 'llama3', 'qwen2', etc.
// The user needs to ensure this model is pulled in their local environment.
export const defaultModel = process.env.LOCAL_LLM_MODEL || 'llama3';
