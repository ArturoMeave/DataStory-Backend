import { Router, type Request, type Response } from "express";
import { generateAIResponse } from "../services/groq.service";
import type { AIRequest, APIError } from "../types";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/generate", async (req: Request, res: Response) => {
  const body = req.body as Partial<AIRequest>;

  // Validación: comprobamos que el frontend envió lo mínimo necesario
  if (!body.prompt || body.prompt.trim() === "") {
    const error: APIError = { error: "El campo prompt es obligatorio." };
    res.status(400).json(error);
    return;
  }

  try {
    const response = await generateAIResponse({
      prompt: body.prompt,
      systemPrompt: body.systemPrompt,
      maxTokens: body.maxTokens,
    });

    res.json(response);
  } catch (err) {
    console.error("[ai/generate]", err);
    const error: APIError = {
      error: "Error al conectar con Groq. Revisa tu API Key.",
    };
    res.status(502).json(error);
  }
});

export default router;
