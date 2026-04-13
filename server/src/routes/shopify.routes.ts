import { Router } from "express";
import {
  getShopifyAuthUrl,
  exchangeShopifyToken,
} from "../services/shopify.service";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", (req, res) => {
  const shop = req.query.shop as string;
  const userId = req.query.userId as string;

  if (!shop || !userId) {
    return res.status(400).send("Faltan parámetros: shop o userId");
  }

  const url = getShopifyAuthUrl(shop, userId);
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  const shop = req.query.shop as string;
  const code = req.query.code as string;
  const userId = req.query.state as string; // Aquí viene de vuelta el ID del usuario

  if (!shop || !code || !userId) {
    return res.redirect("http://localhost:5173/shopify?error=missing_params");
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

export default router;
