import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let transportKey: string | null = null;

export function getTransport() {
  const host = process.env.SMTP_HOST || 'localhost';
  const port = Number(process.env.SMTP_PORT || '1025');
  // secure=true for port 465 (SMTPS), otherwise STARTTLS on 587/others
  const secure = port === 465;
  const user = process.env.SMTP_USER || '';
  const key = `${host}|${port}|${secure ? 'secure' : 'starttls'}|${user ? 'auth' : 'noauth'}`;
  if (!transporter || transportKey !== key) {
    if (transportKey) {
      console.log(`[email] SMTP config changed -> ${host}:${port} secure=${secure}`);
    } else {
      console.log(`[email] SMTP transport init -> ${host}:${port} secure=${secure}`);
    }
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: process.env.SMTP_PASS } : undefined,
    });
    transportKey = key;
  }
  return transporter;
}

export async function sendOtp(to: string, code: string) {
  const t = getTransport();
  const from = process.env.SMTP_FROM || (process.env.SMTP_USER ? `${process.env.SMTP_USER}` : 'OpenMFA <no-reply@openmfa.test>');
  await t.sendMail({
    from,
    to,
    subject: 'Your verification code',
    text: `Your OpenMFA verification code is ${code}. It expires in 5 minutes.`,
  });
}
