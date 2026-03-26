import nodemailer from "nodemailer";
import type { DataSnapshot } from "../types";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_USER,
    },
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function sendAnomalyAlert(
  toEmail: string,
  snapshot: DataSnapshot,
): Promise<void> {
  const transporter = createTransporter();

  const profitColor = snapshot.netProfit >= 0 ? "#22d3a0" : "#f43f5e";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0a0a0f; color: #f0f0f8; border-radius: 12px; overflow: hidden;">
      
      <div style="background: #16161f; padding: 20px 28px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <span style="font-size: 18px; font-weight: 600;">DataStory</span>
        <span style="font-size: 12px; color: #8888a8; margin-left: 12px;">Alerta automática</span>
      </div>

      <div style="padding: 28px;">
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">
          Se han detectado anomalías en tus datos
        </h1>
        <p style="font-size: 14px; color: #8888a8; margin: 0 0 28px; line-height: 1.6;">
          El sistema ha detectado ${snapshot.anomalyCount} ${snapshot.anomalyCount === 1 ? "anomalía" : "anomalías"} en tu último reporte financiero.
        </p>

        <div style="display: grid; gap: 12px; margin-bottom: 28px;">
          
          <div style="background: #16161f; border-radius: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.06);">
            <p style="font-size: 11px; color: #4a4a6a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Ingresos totales</p>
            <p style="font-size: 22px; font-weight: 600; color: #22d3a0; margin: 0;">${formatCurrency(snapshot.totalRevenue)}</p>
          </div>

          <div style="background: #16161f; border-radius: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.06);">
            <p style="font-size: 11px; color: #4a4a6a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Gastos totales</p>
            <p style="font-size: 22px; font-weight: 600; color: #f43f5e; margin: 0;">${formatCurrency(snapshot.totalExpenses)}</p>
          </div>

          <div style="background: #16161f; border-radius: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.06);">
            <p style="font-size: 11px; color: #4a4a6a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Beneficio neto</p>
            <p style="font-size: 22px; font-weight: 600; color: ${profitColor}; margin: 0;">${formatCurrency(snapshot.netProfit)}</p>
          </div>

        </div>

        ${
          snapshot.aiSummary
            ? `
        <div style="background: rgba(124,106,255,0.08); border: 1px solid rgba(124,106,255,0.2); border-radius: 8px; padding: 16px; margin-bottom: 28px;">
          <p style="font-size: 11px; font-weight: 600; color: #7c6aff; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">Análisis de IA</p>
          <p style="font-size: 13px; color: #a0a0c0; line-height: 1.7; margin: 0;">${snapshot.aiSummary}</p>
        </div>
        `
            : ""
        }

        <a href="${process.env.APP_URL ?? "http://localhost:5173"}/dashboard"
          style="display: inline-block; background: #7c6aff; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
          Ver dashboard completo
        </a>
      </div>

      <div style="padding: 16px 28px; background: #0d0d14; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="font-size: 11px; color: #3a3a5a; text-align: center; margin: 0;">
          Enviado por DataStory · Para gestionar tus alertas accede a tu dashboard
        </p>
      </div>

    </div>
  `;

  await transporter.sendMail({
    from: `"DataStory" <${process.env.SMTP_FROM ?? "noreply@datastory.app"}>`,
    to: toEmail,
    subject: `DataStory: ${snapshot.anomalyCount} ${snapshot.anomalyCount === 1 ? "anomalía detectada" : "anomalías detectadas"} en tus datos`,
    html,
  });
}

export async function sendDailyDigest(
  toEmail: string,
  snapshot: DataSnapshot,
): Promise<void> {
  const transporter = createTransporter();

  const profitColor = snapshot.netProfit >= 0 ? "#22d3a0" : "#f43f5e";
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0a0a0f; color: #f0f0f8; border-radius: 12px; overflow: hidden;">

      <div style="background: #16161f; padding: 20px 28px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <span style="font-size: 18px; font-weight: 600;">DataStory</span>
        <span style="font-size: 12px; color: #8888a8; margin-left: 12px;">Resumen diario</span>
      </div>

      <div style="padding: 28px;">
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">
          Buenos días
        </h1>
        <p style="font-size: 14px; color: #8888a8; margin: 0 0 28px;">
          Aquí tienes el estado de tu negocio a ${today}.
        </p>

        <div style="display: grid; gap: 12px; margin-bottom: 28px;">

          <div style="background: #16161f; border-radius: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.06);">
            <p style="font-size: 11px; color: #4a4a6a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Ingresos totales</p>
            <p style="font-size: 22px; font-weight: 600; color: #22d3a0; margin: 0;">${formatCurrency(snapshot.totalRevenue)}</p>
          </div>

          <div style="background: #16161f; border-radius: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.06);">
            <p style="font-size: 11px; color: #4a4a6a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Gastos totales</p>
            <p style="font-size: 22px; font-weight: 600; color: #f43f5e; margin: 0;">${formatCurrency(snapshot.totalExpenses)}</p>
          </div>

          <div style="background: #16161f; border-radius: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.06);">
            <p style="font-size: 11px; color: #4a4a6a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">Beneficio neto</p>
            <p style="font-size: 22px; font-weight: 600; color: ${profitColor}; margin: 0;">${formatCurrency(snapshot.netProfit)}</p>
          </div>

        </div>

        ${
          snapshot.anomalyCount > 0
            ? `
        <div style="background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.25); border-radius: 8px; padding: 14px; margin-bottom: 28px;">
          <p style="font-size: 13px; color: #f43f5e; margin: 0;">
            Se ${snapshot.anomalyCount === 1 ? "ha detectado 1 anomalía" : `han detectado ${snapshot.anomalyCount} anomalías`} en tus datos. Revisa el dashboard.
          </p>
        </div>
        `
            : ""
        }

        <a href="${process.env.APP_URL ?? "http://localhost:5173"}/dashboard"
          style="display: inline-block; background: #7c6aff; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
          Abrir dashboard
        </a>
      </div>

      <div style="padding: 16px 28px; background: #0d0d14; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="font-size: 11px; color: #3a3a5a; text-align: center; margin: 0;">
          Enviado por DataStory · Para gestionar tus alertas accede a tu dashboard
        </p>
      </div>

    </div>
  `;

  await transporter.sendMail({
    from: `"DataStory" <${process.env.SMTP_FROM ?? "noreply@datastory.app"}>`,
    to: toEmail,
    subject: `DataStory — Resumen del ${today}`,
    html,
  });
}
