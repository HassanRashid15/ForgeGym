import OpenAI from "openai";
import { SpaceXAI } from "@xai-official/sdk";
import Groq from "groq-sdk";
import { CohereClient } from "cohere-ai";

/**
 * AI Provider Types
 */
export type AIProvider =
  | "openai"
  | "xai"
  | "groq"
  | "ollama"
  | "cohere";

export interface AICompletionOptions {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionResult {
  content: string;
  model: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * OpenAI Client Singleton
 */
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ OpenAI: API key not found in environment");
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    console.log("✅ OpenAI: API key found, initializing client");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * xAI (Grok) Client Singleton
 */
let xaiClient: SpaceXAI | null = null;

function getXaiClient(): SpaceXAI {
  if (!xaiClient) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("❌ xAI: API key not found in environment");
      throw new Error("XAI_API_KEY environment variable is not set");
    }
    console.log("✅ xAI: API key found, initializing client");
    xaiClient = new SpaceXAI();
  }
  return xaiClient;
}

/**
 * Groq Client Singleton
 */
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("❌ Groq: API key not found in environment");
      throw new Error("GROQ_API_KEY environment variable is not set");
    }
    console.log("✅ Groq: API key found, initializing client");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/**
 * Ollama Client (uses local API, no key needed)
 */
function getOllamaClient() {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  console.log("✅ Ollama: using local API at", baseUrl);
  return { baseUrl };
}

/**
 * Cohere Client Singleton
 */
let cohereClient: CohereClient | null = null;

function getCohereClient(): CohereClient {
  if (!cohereClient) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      console.error("❌ Cohere: API key not found in environment");
      throw new Error("COHERE_API_KEY environment variable is not set");
    }
    console.log("✅ Cohere: API key found, initializing client");
    cohereClient = new CohereClient({ token: apiKey });
  }
  return cohereClient;
}

/**
 * Get default model for each provider
 */
export function getDefaultModel(provider: AIProvider): string {
  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "xai":
      return "grok-4.7";
    case "groq":
      return "openai/gpt-oss-20b";
    case "ollama":
      return "llama3.1";
    case "cohere":
      return "command-a-03-2025";
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get available models for each provider
 */
export function getAvailableModels(provider: AIProvider): string[] {
  switch (provider) {
    case "openai":
      return ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
    case "xai":
      return ["grok-4.7", "grok-4.0"];
    case "groq":
      return ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
    case "ollama":
      return ["llama3.1"];
    case "cohere":
      return ["command-a-03-2025", "command-r-plus-08-2024"];
    default:
      return [];
  }
}

/**
 * Generate text completion using specified AI provider
 */
export async function generateAICompletion(
  messages: AIChatMessage[],
  options: AICompletionOptions = { provider: "openai" }
): Promise<AICompletionResult> {
  const { provider, model, temperature = 0.7, maxTokens = 1000 } = options;
  const selectedModel = model || getDefaultModel(provider);

  try {
    if (provider === "openai") {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: selectedModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
      });

      const content = response.choices[0]?.message?.content || "";
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      return {
        content,
        model: response.model,
        provider,
        usage,
      };
    }

    if (provider === "xai") {
      const client = getXaiClient();
      const response = await client.responses.create({
        model: selectedModel,
        input: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const content = response.toText();

      return {
        content,
        model: selectedModel,
        provider,
      };
    }

    if (provider === "groq") {
      const client = getGroqClient();
      const response = await client.chat.completions.create({
        model: selectedModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
      });

      const content = response.choices[0]?.message?.content || "";
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      return {
        content,
        model: response.model,
        provider,
        usage,
      };
    }

    if (provider === "ollama") {
      const { baseUrl } = getOllamaClient();
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.message?.content || "";

      return {
        content,
        model: selectedModel,
        provider,
      };
    }

    if (provider === "cohere") {
      const client = getCohereClient();
      const response = await client.chat({
        model: selectedModel,
        message: messages[messages.length - 1]?.content || "",
        chatHistory: messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "CHATBOT" : "USER",
          message: m.content,
        })),
        temperature,
        maxTokens: maxTokens,
      });

      const content = response.text || "";

      return {
        content,
        model: selectedModel,
        provider,
      };
    }

    throw new Error(`Unknown provider: ${provider}`);
  } catch (error) {
    console.error(`AI completion error (${provider}):`, error);
    throw error;
  }
}

/**
 * Simple one-shot completion (user message only)
 */
export async function simpleCompletion(
  prompt: string,
  options: AICompletionOptions = { provider: "openai" }
): Promise<AICompletionResult> {
  const messages: AIChatMessage[] = [
    { role: "user", content: prompt },
  ];
  return generateAICompletion(messages, options);
}

/**
 * Chat completion with system prompt
 */
export async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
  options: AICompletionOptions = { provider: "openai" }
): Promise<AICompletionResult> {
  const messages: AIChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
  return generateAICompletion(messages, options);
}

/**
 * Generate structured content (e.g., JSON output)
 * Note: Providers handle structured output differently
 */
export async function generateStructuredContent<T>(
  messages: AIChatMessage[],
  schema: object,
  options: AICompletionOptions = { provider: "openai" }
): Promise<T> {
  const { provider, model, temperature = 0.3 } = options;
  const selectedModel = model || getDefaultModel(provider);

  try {
    if (provider === "openai") {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: selectedModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      return JSON.parse(content) as T;
    }

    if (provider === "xai") {
      const client = getXaiClient();
      const response = await client.responses.create({
        model: selectedModel,
        input: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        text: {
          format: {
            type: "json_schema",
            name: "structured_output",
            schema: schema as any,
          },
        },
      });

      const parsed = response.toJson();
      return parsed as T;
    }

    if (provider === "groq") {
      const client = getGroqClient();
      const response = await client.chat.completions.create({
        model: selectedModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      return JSON.parse(content) as T;
    }

    if (provider === "ollama") {
      const { baseUrl } = getOllamaClient();
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          format: "json",
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.message?.content || "{}";
      return JSON.parse(content) as T;
    }

    if (provider === "cohere") {
      const client = getCohereClient();
      const response = await client.chat({
        model: selectedModel,
        message: messages[messages.length - 1]?.content || "",
        chatHistory: messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "CHATBOT" : "USER",
          message: m.content,
        })),
        temperature,
        preamble: "You must respond with valid JSON only.",
      });

      const content = response.text || "{}";
      return JSON.parse(content) as T;
    }

    throw new Error(`Unknown provider: ${provider}`);
  } catch (error) {
    console.error(`Structured content generation error (${provider}):`, error);
    throw error;
  }
}

/**
 * Helper function to check if AI providers are configured
 */
export function isAIProviderConfigured(provider: AIProvider): boolean {
  switch (provider) {
    case "openai":
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      console.log(`🔍 OpenAI configured: ${hasOpenAI}`);
      return hasOpenAI;
    case "xai":
      const hasXAI = !!process.env.XAI_API_KEY;
      console.log(`🔍 xAI configured: ${hasXAI}`);
      return hasXAI;
    case "groq":
      const hasGroq = !!process.env.GROQ_API_KEY;
      console.log(`🔍 Groq configured: ${hasGroq}`);
      return hasGroq;
    case "ollama":
      const hasOllama = !!process.env.OLLAMA_BASE_URL || true;
      console.log(`🔍 Ollama configured: ${hasOllama}`);
      return hasOllama;
    case "cohere":
      const hasCohere = !!process.env.COHERE_API_KEY;
      console.log(`🔍 Cohere configured: ${hasCohere}`);
      return hasCohere;
    default:
      return false;
  }
}

/**
 * Get list of configured providers
 */
export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (isAIProviderConfigured("openai")) providers.push("openai");
  if (isAIProviderConfigured("xai")) providers.push("xai");
  if (isAIProviderConfigured("groq")) providers.push("groq");
  if (isAIProviderConfigured("ollama")) providers.push("ollama");
  if (isAIProviderConfigured("cohere")) providers.push("cohere");
  console.log("📋 Configured AI providers:", providers);
  return providers;
}
