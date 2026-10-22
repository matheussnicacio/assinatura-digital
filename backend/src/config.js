const need = (key, fallback) => {
  const v = process.env[key] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Variável de ambiente ${key} não definida`);
  return v;
};

const jwtSecret = need('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET deve ter ao menos 32 caracteres');

module.exports = {
  port: Number(need('PORT', '4000')),
  mongoUri: need('MONGODB_URI'),
  jwtSecret,
  jwtExpires: need('JWT_EXPIRES', '1h'),
  corsOrigins: need('CORS_ORIGINS', 'http://localhost:3000').split(',').map((s) => s.trim()),
  uploadDir: need('UPLOAD_DIR', '/data/uploads'),
  appUrl: need('APP_URL', 'http://localhost:3000'),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Assinatura Digital <no-reply@example.com>',
  },
  seedManager: {
    name: process.env.SEED_MANAGER_NAME || 'Gerente',
    email: process.env.SEED_MANAGER_EMAIL || '',
    password: process.env.SEED_MANAGER_PASSWORD || '',
  },
};
