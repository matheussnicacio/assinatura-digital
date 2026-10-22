const router = require('express').Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const { authenticate, requireRole } = require('../middleware/auth');
const { wrap, HttpError } = require('../utils');
const { verifyEcdsa, sha256Hex } = require('../services/crypto');
const { canonicalPayload, receiptsIntact } = require('../services/expenses');
const audit = require('../services/audit');

router.use(authenticate, requireRole('gerente'));

// Verificação completa de autenticidade, integridade e vínculo do signatário com a chave.
router.get(
  '/:id/verify',
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Identificador inválido');
    const e = await Expense.findById(req.params.id).populate('signature.signer', 'name email publicKeys');
    if (!e) throw new HttpError(404, 'Despesa não encontrada');
    if (e.status !== 'ASSINADA' || !e.signature || !e.signature.signer) throw new HttpError(409, 'Documento ainda não foi assinado');

    const s = e.signature;
    const signer = s.signer;
    const keyRec = signer.publicKeys.find((k) => k.keyId === s.keyId);

    const checks = {
      assinaturaCriptografica: verifyEcdsa(s.spki, s.payload, s.signature), // autenticidade
      chaveDoSignatario: !!keyRec && keyRec.spki === s.spki, // a chave pertence ao signatário
      chaveValidaNaAssinatura: !!keyRec && keyRec.createdAt <= s.signedAt && (!keyRec.revokedAt || keyRec.revokedAt >= s.signedAt),
      hashDoDocumento: sha256Hex(s.payload) === s.payloadHash,
      documentoNaoAlterado: canonicalPayload(e) === s.payload, // integridade dos dados atuais
      recibosIntegros: await receiptsIntact(e), // integridade dos anexos
    };
    const valid = Object.values(checks).every(Boolean);
    audit(req, 'ASSINATURA_VERIFICADA', { valid, checks }, req.user._id, e._id);

    res.json({
      valid,
      checks,
      expense: { id: String(e._id), title: e.title },
      signature: {
        signer: { name: signer.name, email: signer.email },
        keyId: s.keyId,
        spki: s.spki,
        algorithm: s.algorithm,
        payload: s.payload,
        payloadHash: s.payloadHash,
        signature: s.signature,
        signedAt: s.signedAt,
      },
    });
  })
);

module.exports = router;
