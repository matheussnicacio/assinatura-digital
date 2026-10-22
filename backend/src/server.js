const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cfg = require('./config');
const app = require('./app');
const User = require('./models/User');

// Cria o primeiro gerente (somente se o banco estiver vazio) a partir das variáveis SEED_MANAGER_*.
async function bootstrapManager() {
  if (await User.estimatedDocumentCount()) return;
  const { name, email, password } = cfg.seedManager;
  if (!email || !password) {
    console.warn('Banco vazio e SEED_MANAGER_EMAIL/SEED_MANAGER_PASSWORD não definidos: nenhum usuário criado.');
    return;
  }
  await User.create({ name, email, role: 'gerente', cargo: 'Gerente', passwordHash: await bcrypt.hash(password, 12) });
  console.log(`Gerente inicial criado: ${email}`);
}

(async () => {
  fs.mkdirSync(cfg.uploadDir, { recursive: true });
  await mongoose.connect(cfg.mongoUri);
  await bootstrapManager();
  const server = app.listen(cfg.port, () => console.log(`API ouvindo na porta ${cfg.port}`));
  const stop = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
})().catch((e) => {
  console.error('Falha ao iniciar:', e.message);
  process.exit(1);
});
