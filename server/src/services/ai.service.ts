import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function askDocumentAI(
  documentText: string,
  userQuestion: string,
): Promise<string> {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Eres un analista financiero y de datos de nivel experto. Tu trabajo es responder a las preguntas del usuario basándote ESTRICTAMENTE en el texto del documento proporcionado. Si la respuesta no está en el documento, di claramente que no tienes esa información. No inventes datos. Sé analítico, profesional, directo y argumenta tus respuestas.",
        },
        {
          role: "user",
          content: `DOCUMENTO:\n${documentText}\n\nPREGUNTA DEL USUARIO:\n${userQuestion}`,
        },
      ],
      // 👇 AQUÍ ESTÁ LA SOLUCIÓN: Le pedimos el modelo nuevo y actualizado
      model: "llama-3.3-70b-versatile",
      temperature: 0.2, // Mantenemos la temperatura baja para que sea muy preciso y no invente nada
    });

    return (
      chatCompletion.choices[0]?.message?.content ||
      "No pude generar una respuesta."
    );
  } catch (error) {
    console.error("Error en Groq AI (Documentos):", error);
    throw new Error("Error al conectar con el cerebro de IA.");
  }
}
