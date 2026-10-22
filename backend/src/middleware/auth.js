const jwt = require('jsonwebtoken');
const cfg = require('../config');
const User = require('../models/User');

async function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, cfg.jwtSecret, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'Sessão inválida' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Acesso negado' });

module.exports = { authenticate, requireRole };
