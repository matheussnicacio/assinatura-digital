const { z } = require('zod');
const xss = require('xss');

// Texto livre: limita tamanho e remove qualquer marcação HTML/script (defesa em profundidade contra XSS).
const text = (min, max) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .transform((s) => xss(s, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] }));

const validate = (schema, where = 'body') => (req, res, next) => {
  const r = schema.safeParse(req[where]);
  if (!r.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: r.error.issues.map((i) => `${i.path.join('.') || where}: ${i.message}`),
    });
  }
  req[where] = r.data;
  next();
};

module.exports = { validate, text, z };
