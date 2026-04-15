import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import fs from "fs";
import path from "path";

const router = Router();

// Protegemos las rutas con tu middleware
router.use(authMiddleware);

// 🗄️ "Base de datos" temporal: Guardaremos los datos en un archivo físico del servidor
// Esto garantiza que los datos sobrevivan aunque el usuario pulse F5
const DB_FILE = path.join(process.cwd(), "workspace_database.json");

// 1. RUTA PARA GUARDAR LOS DATOS DEL EXCEL
router.post("/data", async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    const userId = (req as any).user?.id || "default_user"; // Sacamos el ID de tu token

    // Leemos la base de datos actual
    let allData: any = {};
    if (fs.existsSync(DB_FILE)) {
      allData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }

    // Guardamos los datos nuevos en la "carpeta" de este usuario
    allData[userId] = data;

    // Escribimos en el disco duro
    fs.writeFileSync(DB_FILE, JSON.stringify(allData));

    res.json({ success: true, message: "Datos guardados permanentemente." });
  } catch (error) {
    console.error("[workspace/data POST]", error);
    res.status(500).json({ error: "Error guardando los datos financieros." });
  }
});

// 2. RUTA PARA DEVOLVER LOS DATOS AL CARGAR LA PÁGINA
router.get("/data", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || "default_user";

    if (fs.existsSync(DB_FILE)) {
      const allData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      // Devolvemos los datos del usuario, o un array vacío si no tiene
      res.json({ rows: allData[userId] || [] });
      return;
    }

    res.json({ rows: [] });
  } catch (error) {
    console.error("[workspace/data GET]", error);
    res.status(500).json({ error: "Error recuperando los datos financieros." });
  }
});

export default router;
