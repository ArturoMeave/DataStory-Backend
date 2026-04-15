import { Router, type Request, type Response } from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse"; // 1. Importamos la versión moderna (v2)
import { generateAIResponse } from "../services/groq.service";
import { askDocumentAI } from "../services/ai.service";
import type { AIRequest, APIError } from "../types";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Configuramos Multer para recibir PDFs en memoria
const upload = multer({ storage: multer.memoryStorage() });

// 🧠 Memoria temporal del servidor para guardar los PDFs leídos
const documentMemory: Record<string, string> = {};

// Protegemos todas las rutas
router.use(authMiddleware);

// =========================================================
// 1. RUTA ORIGINAL (Generación IA General)
// =========================================================
router.post("/generate", async (req: Request, res: Response) => {
  const body = req.body as Partial<AIRequest>;

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
    res.status(502).json({
      error: "El servicio de análisis no está disponible en este momento.",
    });
  }
});

// =========================================================
// 2. NUEVA RUTA: Subir y leer PDF (Con la API v2)
// =========================================================
router.post(
  "/upload-pdf",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No se subió ningún archivo." });
        return;
      }

      // 2. Creamos el lector moderno pasándole el archivo
      const parser = new PDFParse({ data: req.file.buffer });

      // Le decimos que extraiga todo el texto
      const textResult = await parser.getText();
      const extractedText = textResult.text;

      // 3. Limpiamos la memoria para que el servidor no se sature
      await parser.destroy();

      // Generamos un DNI único para este documento
      const documentId = `doc_${Date.now()}`;
      documentMemory[documentId] = extractedText; // Lo guardamos en la memoria temporal

      res.json({
        message: "Documento procesado con éxito.",
        documentId: documentId,
      });
    } catch (error) {
      console.error("[ai/upload-pdf] Error:", error);
      res.status(500).json({ error: "Error al extraer el texto del PDF." });
    }
  },
);

// =========================================================
// 3. NUEVA RUTA: Preguntar a la IA sobre el PDF
// =========================================================
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      res
        .status(400)
        .json({ error: "Falta el ID del documento o la pregunta." });
      return;
    }

    const documentText = documentMemory[documentId];
    if (!documentText) {
      res
        .status(404)
        .json({
          error:
            "El documento ha expirado o no se encuentra en memoria. Súbelo de nuevo.",
        });
      return;
    }

    // Le pasamos el texto del PDF y la pregunta a Llama3
    const aiResponse = await askDocumentAI(documentText, question);

    res.json({ answer: aiResponse });
  } catch (error) {
    console.error("[ai/chat] Error:", error);
    res.status(500).json({ error: "Error al consultar al Analista IA." });
  }
});

export default router;
