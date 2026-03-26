import Groq from "groq-sdk";
import type { AIRequest, AIResponse } from "../types";

const MODEL = "llama-3.3-70b-versatile";

export async function generateAIResponse(
  request: AIRequest,
): Promise<AIResponse> {
  // El cliente se crea aquí dentro, solo cuando alguien llama a la función.
  // Si la clave no está, el error ocurre al hacer la petición,
  // no al arrancar el servidor.
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

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
