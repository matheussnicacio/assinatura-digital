const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const { sha256Hex } = require('./crypto');

const idOf = (x) => String((x && x._id) || x);

// Documento canônico: ordem de campos fixa => mesma string => mesmo hash.
// É exatamente este texto que o usuário assina no navegador.
function canonicalPayload(e) {
  return JSON.stringify({
    v: 1,
    expenseId: idOf(e._id),
    ownerId: idOf(e.owner),
    title: e.title,
    description: e.description || '',
    amount: Number(e.amount).toFixed(2),
    date: new Date(e.date).toISOString().slice(0, 10),
    receipts: e.receipts.map((r) => ({ name: r.originalName, sha256: r.sha256, size: r.size })),
    validatedBy: idOf(e.validation.by),
    validatedAt: new Date(e.validation.at).toISOString(),
  });
}

function sha256File(filePath) {
  return sha256Hex(fs.readFileSync(filePath));
}

// Reconfere os recibos no disco contra o hash registrado no upload.
async function receiptsIntact(e) {
  try {
    for (const r of e.receipts) {
      const buf = await fs.promises.readFile(path.join(cfg.uploadDir, r.storedName));
      if (sha256Hex(buf) !== r.sha256) return false;
    }
    return true;
  } catch {
    return false;
  }
}

module.exports = { canonicalPayload, sha256File, receiptsIntact };
