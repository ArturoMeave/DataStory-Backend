import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import googleRoutes from "./routes/google.routes";
import aiRoutes from "./routes/ai.routes";
import snapshotsRoutes from "./routes/snapshots.routes";
import workspaceRoutes from "./routes/workspace.routes";
import sessionsRoutes from "./routes/sessions.routes";
import invitationRoutes from "./routes/invitation.routes";

import shopifyRoutes from "./routes/shopify.routes";

import { startCronJobs } from "./jobs/monitor";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.APP_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/auth", googleRoutes);
// AQUÍ ENCHUFAMOS SHOPIFY
app.use("/api/auth/shopify", shopifyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/snapshots", snapshotsRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/invitations", invitationRoutes);

startCronJobs();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor DataStory encendido en el puerto ${PORT}`);
  console.log(`🛍️  Ruta de Shopify lista para conectar`);
});
