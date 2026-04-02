import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import aiRoutes from "./routes/ai.routes";
import snapshotsRoutes from "./routes/snapshots.routes";
import authRoutes from "./routes/auth.routes";
import { startCronJobs } from "./jobs/monitor";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// 1. Seguridad primero
app.use(helmet());

// 2. CORS y parseo de JSON — antes que cualquier otra cosa
app.use(
  cors({
    origin: process.env.APP_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// 3. Rate limiting por ruta
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiadas peticiones. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. Rutas
app.use("/api/ai", generalLimiter, aiRoutes);
app.use("/api/snapshots", generalLimiter, snapshotsRoutes);
app.use("/api/auth", authLimiter, authRoutes);

// 5. Health check — sin rate limiting
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
  });
});

startCronJobs();

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV ?? "development"}`);
});
