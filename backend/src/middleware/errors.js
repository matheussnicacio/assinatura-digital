const multer = require('multer');

const notFound = (req, res) => res.status(404).json({ error: 'Rota não encontrada' });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo maior que 5 MB' : 'Falha no upload';
    return res.status(400).json({ error: msg });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Identificador inválido' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' }); // nunca vaza stack trace
};

module.exports = { notFound, errorHandler };
