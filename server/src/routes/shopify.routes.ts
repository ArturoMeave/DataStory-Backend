import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth.middleware"; // El guardia de seguridad
import {
  getShopifyAuthUrl,
  exchangeShopifyToken,
  getShopifyData, // Importamos la nueva función
} from "../services/shopify.service";

const router = Router();
const prisma = new PrismaClient();

// 1. Ruta de IDA (Va a Shopify)
router.get("/", (req, res) => {
  const shop = req.query.shop as string;
  const userId = req.query.userId as string;

  if (!shop || !userId) {
    res.status(400).send("Faltan parámetros: shop o userId");
    return;
  }

  const url = getShopifyAuthUrl(shop, userId);
  res.redirect(url);
});

// 2. Ruta de VUELTA (Trae la llave)
router.get("/callback", async (req, res) => {
  const shop = req.query.shop as string;
  const code = req.query.code as string;
  const userId = req.query.state as string;

  if (!shop || !code || !userId) {
    res.redirect("http://localhost:5173/shopify?error=missing_params");
    return;
  }

  try {
    const accessToken = await exchangeShopifyToken(shop, code);

    await prisma.shopifyConnection.upsert({
      where: { userId: userId },
      update: { shop, accessToken },
      create: { shop, accessToken, userId },
    });

    res.redirect("http://localhost:5173/shopify?success=true");
  } catch (error) {
    res.redirect("http://localhost:5173/shopify?error=auth_failed");
  }
});

// ─── NUEVO: 3. RUTA PARA PEDIR LOS DATOS ───
// Le ponemos "authMiddleware" para asegurarnos de que solo el dueño vea sus datos
router.get("/data", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Buscamos en la base de datos la llave de la tienda de este usuario
    const connection = await prisma.shopifyConnection.findUnique({
      where: { userId: userId },
    });

    if (!connection) {
      res.status(404).json({ error: "No tienes ninguna tienda vinculada." });
      return;
    }

    // Le pasamos la llave a la función que creamos en el Paso 1
    const data = await getShopifyData(connection.shop, connection.accessToken);

    // Le devolvemos los datos al Frontend
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
