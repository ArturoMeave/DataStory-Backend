import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/ai.routes";
import snapshotsRoutes from "./routes/snapshots.routes";
import authRoutes from "./routes/auth.routes";
import { startCronJobs } from "./jobs/monitor";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

app.use(helmet());

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiadas peticiones. Intenta de nuevo en 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 100,
  max: 5,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generateLimiter);
app.use("/api/auth", authLimiter);

const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.APP_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/ai", aiRoutes);
app.use("/api/snapshots", snapshotsRoutes);
app.use("/api/auth", authRoutes);

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
