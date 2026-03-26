import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/ai.routes";
<<<<<<< HEAD
import snapshotsRoutes from "./routes/snapshots.routes";
=======
>>>>>>> 643f6cc9afd2741fdc3861236a608034a468c464

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.APP_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/ai", aiRoutes);

<<<<<<< HEAD
app.use("/api/snapshots", snapshotsRoutes);

=======
>>>>>>> 643f6cc9afd2741fdc3861236a608034a468c464
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV ?? "development"}`);
});
