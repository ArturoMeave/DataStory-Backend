import Groq from "groq-sdk";
import type { AIRequest, AIResponse } from "../types";

<<<<<<< HEAD
=======
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

>>>>>>> 643f6cc9afd2741fdc3861236a608034a468c464
const MODEL = "llama-3.3-70b-versatile";

export async function generateAIResponse(
  request: AIRequest,
): Promise<AIResponse> {
<<<<<<< HEAD
  // El cliente se crea aquí dentro, solo cuando alguien llama a la función.
  // Si la clave no está, el error ocurre al hacer la petición,
  // no al arrancar el servidor.
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

=======
>>>>>>> 643f6cc9afd2741fdc3861236a608034a468c464
  const messages: Array<{ role: "system" | "user"; content: string }> = [];

  if (request.systemPrompt) {
    messages.push({
      role: "system",
      content: request.systemPrompt,
    });
  }
<<<<<<< HEAD

=======
>>>>>>> 643f6cc9afd2741fdc3861236a608034a468c464
  messages.push({
    role: "user",
    content: request.prompt,
  });
<<<<<<< HEAD

=======
>>>>>>> 643f6cc9afd2741fdc3861236a608034a468c464
  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: request.maxTokens ?? 500,
    messages,
  });
<<<<<<< HEAD

=======
>>>>>>> 643f6cc9afd2741fdc3861236a608034a468c464
  const content = completion.choices[0]?.message?.content ?? "";

  return { content };
}
