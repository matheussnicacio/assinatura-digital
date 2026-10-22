const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cfg = require('../config');
const User = require('../models/User');
const { validate, z } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { wrap, HttpError } = require('../utils');
const { parseP256PublicKey, keyFingerprint } = require('../services/crypto');
const audit = require('../services/audit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

// Hash falso para igualar o tempo de resposta quando o e-mail não existe (evita enumeração de usuários).
const DUMMY_HASH = bcrypt.hashSync('senha-falsa-para-igualar-tempo', 12);

router.post(
  '/login',
  loginLimiter,
  validate(z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) })),
  wrap(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (user && user.lockUntil && user.lockUntil > new Date()) {
      throw new HttpError(423, 'Conta temporariamente bloqueada. Tente novamente em alguns minutos.');
    }
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok || !user.active) {
      if (user && !ok) {
        user.failedLogins += 1;
        if (user.failedLogins >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          user.failedLogins = 0;
        }
        await user.save();
      }
      audit(req, 'LOGIN_FALHA', { email });
      throw new HttpError(401, 'E-mail ou senha incorretos');
    }
    user.failedLogins = 0;
    user.lockUntil = undefined;
    await user.save();
    const token = jwt.sign({ sub: String(user._id), role: user.role }, cfg.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: cfg.jwtExpires,
    });
    audit(req, 'LOGIN', {}, user._id);
    res.json({ token, user: user.toPublic() });
  })
);

router.get('/me', authenticate, (req, res) => res.json({ user: req.user.toPublic() }));

// Registra a chave PÚBLICA do usuário (a privada nunca sai do navegador). Exige a senha novamente.
router.post(
  '/keys',
  authenticate,
  validate(z.object({ spki: z.string().min(80).max(400), password: z.string().min(1).max(200) })),
  wrap(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(req.body.password, user.passwordHash))) throw new HttpError(401, 'Senha incorreta');
    let keyId;
    try {
      parseP256PublicKey(req.body.spki);
      keyId = keyFingerprint(req.body.spki);
    } catch {
      throw new HttpError(400, 'Chave pública inválida (esperado ECDSA P-256 em SPKI/base64)');
    }
    const now = new Date();
    user.publicKeys.forEach((k) => {
      if (!k.revokedAt) k.revokedAt = now; // revoga a chave anterior (histórico preservado)
    });
    user.publicKeys.push({ keyId, spki: req.body.spki });
    await user.save();
    audit(req, 'CHAVE_REGISTRADA', { keyId });
    res.status(201).json({ keyId });
  })
);

module.exports = router;
