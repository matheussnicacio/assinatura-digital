const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cfg = require('./config');
const csrfGuard = require('./middleware/csrf');
const { notFound, errorHandler } = require('./middleware/errors');
const { HttpError } = require('./utils');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Cabeçalhos HTTP de segurança (Helmet). API só devolve JSON/arquivos: CSP restritiva.
app.use(
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // o frontend (outra origem) baixa recibos via fetch
  })
);

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || cfg.corsOrigins.includes(origin) ? cb(null, true) : cb(new HttpError(403, 'Origem não permitida')),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(mongoSanitize()); // remove operadores NoSQL ($, .) do input: impede injeção no MongoDB
app.use(hpp()); // bloqueia poluição de parâmetros HTTP
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api', csrfGuard);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/signatures', require('./routes/signatures'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
