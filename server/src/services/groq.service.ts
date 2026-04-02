import Groq from "groq-sdk";
import type { AIRequest, AIResponse } from "../types";

const MODEL = "llama-3.3-70b-versatile";

// Creamos la instancia fuera de la función para reutilizarla,
// pero usamos una función que la inicializa tarde para garantizar
// que dotenv ya cargó las variables de entorno
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY no está definida en el archivo .env");
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export async function generateAIResponse(
  request: AIRequest,
): Promise<AIResponse> {
  const groq = getGroqClient();

  const messages: Array<{ role: "system" | "user"; content: string }> = [];

  if (request.systemPrompt) {
    messages.push({ role: "system", content: request.systemPrompt });
  }

  messages.push({ role: "user", content: request.prompt });

  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: request.maxTokens ?? 500,
    messages,
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return { content };
}
