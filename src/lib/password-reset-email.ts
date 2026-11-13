import { createTransport } from "nodemailer";

type MailSettings = {
  host: string;
  port: number;
  from: string;
  user?: string;
  password?: string;
};

function getMailSettings(): MailSettings | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535 || Boolean(user) !== Boolean(password)) return null;
  return { host, port, from, ...(user ? { user, password } : {}) };
}

export function isPasswordResetEmailConfigured() {
  const appUrl = process.env.NEXTAUTH_URL;
  if (!getMailSettings() || !appUrl) return false;
  try {
    const url = new URL(appUrl);
    return process.env.NODE_ENV !== "production" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const settings = getMailSettings();
  if (!settings) throw new Error("SMTP settings are incomplete.");
  const transport = createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    requireTLS: settings.port !== 465 && process.env.NODE_ENV === "production",
    ...(settings.user && settings.password ? { auth: { user: settings.user, pass: settings.password } } : {}),
  });
  await transport.sendMail({
    from: settings.from,
    to,
    subject: "Reset your Bandwise password",
    text: `Use this link within 30 minutes to reset your Bandwise password:\n\n${resetUrl}\n\nIf you did not request a reset, you can ignore this message.`,
  });
}
