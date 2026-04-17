import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  generateInvitation,
  validateInvitation,
  acceptInvitation,
} from "../services/invitation.service";

const router = Router();
const prisma = new PrismaClient();

router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const invitation = await generateInvitation(req.userId!, role || "EDITOR");
    res.json({ code: invitation.code });
  } catch (error: any) {
    res.status(403).json({ error: error.message });
  }
});

router.get("/validate/:code", async (req, res) => {
  try {
    const info = await validateInvitation(req.params.code);
    res.json(info);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post("/accept", authMiddleware, async (req, res) => {
  try {
    const { code, force } = req.body;
    const user = await acceptInvitation(req.userId!, code, force);
    res.json({ message: "¡Bienvenido al equipo!", user });
  } catch (error: any) {
    if (error.requiresConfirmation) {
      res.status(409).json({ error: error.message, requiresConfirmation: true, code: error.code });
      return;
    }
    res.status(400).json({ error: error.message });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user || !user.workspaceId) {
      res.status(400).json({ error: "El usuario no pertenece a ningún workspace." });
      return;
    }
    
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      res.status(403).json({ error: "No tienes permisos suficientes." });
      return;
    }

    const invitations = await prisma.invitation.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" }
    });

    res.json(invitations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      res.status(403).json({ error: "No tienes permisos suficientes." });
      return;
    }

    const id = req.params.id as string;
    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation || invitation.workspaceId !== user.workspaceId) {
      res.status(404).json({ error: "Invitación no encontrada." });
      return;
    }

    await prisma.invitation.delete({ where: { id } });
    res.json({ message: "Invitación revocada." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
