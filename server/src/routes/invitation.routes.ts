import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  generateInvitation,
  validateInvitation,
  acceptInvitation,
} from "../services/invitation.service";

const router = Router();

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
    const { code } = req.body;
    const user = await acceptInvitation(req.userId!, code);
    res.json({ message: "¡Bienvenido al equipo!", user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
