const nodemailer = require('nodemailer');
const cfg = require('../config');

// Sem SMTP configurado, as mensagens são apenas registradas no log (modo desenvolvimento).
const transport = cfg.smtp.host
  ? nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.secure,
      auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

async function notify(to, subject, text) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  try {
    const info = await transport.sendMail({ from: cfg.smtp.from, to, subject, text });
    if (!cfg.smtp.host) console.log('[e-mail simulado]', info.message);
  } catch (e) {
    console.error('Falha ao enviar e-mail:', e.message); // falha de e-mail não derruba a operação
  }
}

module.exports = { notify };
