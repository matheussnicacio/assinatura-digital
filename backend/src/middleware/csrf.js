const cfg = require('../config');

// Proteção CSRF: a API usa JWT em cabeçalho Authorization (nunca em cookie), então o navegador
// não anexa credenciais automaticamente. Mesmo assim, exigimos origem permitida e um cabeçalho
// customizado (que obriga preflight CORS) em toda requisição que altera estado.
module.exports = function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !cfg.corsOrigins.includes(origin)) return res.status(403).json({ error: 'Origem inválida' });
  if (req.get('x-requested-with') !== 'XMLHttpRequest') return res.status(403).json({ error: 'Cabeçalho CSRF ausente' });
  next();
};
