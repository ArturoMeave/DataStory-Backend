import Groq from "groq-sdk";
import type { AIRequest, AIResponse } from "../types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

export async function generateAIResponse(
  request: AIRequest,
): Promise<AIResponse> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [];

  if (request.systemPrompt) {
    messages.push({
      role: "system",
      content: request.systemPrompt,
    });
  }
  messages.push({
    role: "user",
    content: request.prompt,
  });
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: request.maxTokens ?? 500,
    messages,
  });
  const content = completion.choices[0]?.message?.content ?? "";

  return { content };
}
