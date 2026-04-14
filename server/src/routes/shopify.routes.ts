import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getShopifyAuthUrl,
  exchangeShopifyToken,
  syncShopifyStore,
  getShopifyData,
  handleOrderWebhook,
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

// ─── 3. RUTA PARA PEDIR LOS DATOS (VERSIÓN CACHÉ) ───
router.get("/data", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const connection = await prisma.shopifyConnection.findUnique({
      where: { userId: userId },
    });

    if (!connection) {
      res.status(404).json({ error: "No tienes ninguna tienda vinculada." });
      return;
    }

    // 1. Primero mandamos al bibliotecario a rellenar o actualizar las estanterías
    await syncShopifyStore(userId, connection.shop, connection.accessToken);

    // 2. Luego leemos los datos desde nuestras estanterías rapidísimo
    const data = await getShopifyData(userId);

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/webhooks/orders", async (req: Request, res: Response) => {
  const shop = req.headers["x-shopify-shop-domain"] as string;
  const orderData = req.body;

  if (!shop || !orderData) {
    res.status(400).send("Faltan datos del webhook");
    return;
  }

  res.status(200).send("Webhook recibido");

  await handleOrderWebhook(shop, orderData);
});

export default router;
