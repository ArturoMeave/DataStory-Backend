import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * LÓGICA PARA EL ANALISTA DE DOCUMENTOS (PDF)
 * Se enfoca en leer textos largos y ser muy preciso con lo que dice el papel.
 */
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
            "Eres un analista experto en documentos. Tu trabajo es extraer información ESTRICTAMENTE del texto proporcionado. Si el usuario te saluda, responde amablemente. Si te pregunta algo que no está en el documento, indícalo. No inventes hechos.",
        },
        {
          role: "user",
          content: `CONTENIDO DEL DOCUMENTO:\n${documentText}\n\nPREGUNTA:\n${userQuestion}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });

    return (
      chatCompletion.choices[0]?.message?.content ||
      "No pude generar una respuesta sobre el documento."
    );
  } catch (error) {
    console.error("Error en Groq AI (Documentos):", error);
    throw new Error("Error al conectar con el cerebro de IA.");
  }
}

/**
 * LÓGICA PARA EL COPILOTO OMNISCIENTE (Análisis Global del Negocio)
 * Actúa como CFO con visión total de finanzas, equipo e historial.
 */
export async function askDataAI(
  data: any,
  userQuestion: string,
): Promise<string> {
  try {
    const dataContext =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
Eres el "Copiloto Omnisciente" y CFO (Director Financiero) de Élite de DataStory.

REGLAS CRÍTICAS (ANTIGRAVITY MODE):
1. Veracidad Absoluta: JAMÁS inventes datos ni asumas números. Usa exclusivamente la información proporcionada en el "CONTEXTO OMNISCIENTE".
2. Prioridad de Búsqueda:
   - Si preguntan por PERSONAS, EQUIPO o MIEMBROS: busca en la sección 'workspace'.
   - Si preguntan por REGISTROS, INFORMES o SNAPSHOTS: busca en 'workspace' (total_snapshots) o considera las 'filas_en_pantalla' en 'financials'.
   - Si preguntan por DINERO, VENTAS, INGRESOS o PEDIDOS: busca estrictamente en la sección 'financials'.
3. Educación y Cortesía: Si el usuario te saluda (ej. "Hola", "Buenos días"), respóndele devolviendo el saludo amablemente y ponte a su disposición como su CFO experto. ¡NO le digas "faltan datos" en un saludo!
4. Si falta información en el contexto sobre lo que te piden, indícalo de manera clara y profesional.
          `.trim(),
        },
        {
          role: "user",
          content: `CONTEXTO OMNISCIENTE:\n${dataContext}\n\nPREGUNTA DEL USUARIO:\n${userQuestion}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1, // 100% Precisión con los números matemáticos 
    });

    return (
      chatCompletion.choices[0]?.message?.content || "Sin respuesta disponible."
    );
  } catch (error) {
    console.error("Error en Groq AI (Datos):", error);
    throw new Error("Error al conectar con el cerebro de IA.");
  }
}
