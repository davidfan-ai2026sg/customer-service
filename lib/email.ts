import nodemailer from "nodemailer";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

export async function sendFactoryEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ sent: boolean; via?: string; error?: string }> {
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "Aunty Hong <onboarding@resend.dev>",
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        return { sent: false, via: "resend", error: body.slice(0, 300) };
      }
      return { sent: true, via: "resend" };
    } catch (e) {
      return { sent: false, via: "resend", error: String(e) };
    }
  }

  if (process.env.SMTP_HOST) {
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE === "true" || port === 465,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      return { sent: true, via: "smtp" };
    } catch (e) {
      return { sent: false, via: "smtp", error: String(e) };
    }
  }

  return { sent: false, error: "RESEND_API_KEY or SMTP_HOST is not set; skipped sending." };
}
