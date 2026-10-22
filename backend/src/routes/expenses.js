const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const cfg = require('../config');
const User = require('../models/User');
const Expense = require('../models/Expense');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, text, z } = require('../middleware/validate');
const { wrap, HttpError } = require('../utils');
const { notify } = require('../services/mailer');
const audit = require('../services/audit');
const { verifyEcdsa, sha256Hex } = require('../services/crypto');
const { canonicalPayload, sha256File, receiptsIntact } = require('../services/expenses');

const STATUS = ['SUBMETIDA', 'VALIDADA', 'REJEITADA', 'ASSINADA'];
const MIME = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' };

router.use(authenticate);
router.param('id', (req, res, next, id) =>
  mongoose.isValidObjectId(id) ? next() : res.status(400).json({ error: 'Identificador inválido' })
);

// ---------- Upload seguro: tipo, tamanho, quantidade, nome aleatório e conferência de assinatura de arquivo ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: (r, f, cb) => cb(null, cfg.uploadDir),
    filename: (r, f, cb) => cb(null, crypto.randomUUID() + MIME[f.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (r, f, cb) =>
    MIME[f.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Tipo de arquivo não permitido (use PDF, JPG ou PNG)')),
});

function magicOk(file) {
  const fd = fs.openSync(file.path, 'r');
  const b = Buffer.alloc(8);
  fs.readSync(fd, b, 0, 8, 0);
  fs.closeSync(fd);
  if (file.mimetype === 'application/pdf') return b.subarray(0, 4).toString() === '%PDF';
  if (file.mimetype === 'image/png') return b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

const createSchema = z.object({
  title: text(3, 150),
  description: text(0, 2000).optional(),
  amount: z.coerce.number().positive().max(1_000_000),
  date: z.coerce.date(),
});

// ---------- Helpers ----------
function serialize(e) {
  const owner = e.owner && e.owner.name ? { id: String(e.owner._id), name: e.owner.name, email: e.owner.email } : { id: String(e.owner) };
  const v = e.validation && e.validation.at ? e.validation : null;
  const s = e.signature && e.signature.signedAt ? e.signature : null;
  return {
    id: String(e._id),
    title: e.title,
    description: e.description,
    amount: e.amount,
    date: e.date,
    status: e.status,
    createdAt: e.createdAt,
    owner,
    receipts: (e.receipts || []).map((r, i) => ({ index: i, name: r.originalName, mime: r.mime, size: r.size, sha256: r.sha256 })),
    validation: v && { decision: v.decision, note: v.note, at: v.at, by: v.by && v.by.name ? v.by.name : null },
    signature: s && { signedAt: s.signedAt, keyId: s.keyId, payloadHash: s.payloadHash, algorithm: s.algorithm },
  };
}

async function loadForUser(req) {
  const e = await Expense.findById(req.params.id);
  if (!e) throw new HttpError(404, 'Despesa não encontrada');
  const isOwner = String(e.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== 'gerente') throw new HttpError(404, 'Despesa não encontrada'); // não revela existência
  return { e, isOwner };
}

const managersEmails = async (exceptId) =>
  (await User.find({ role: 'gerente', active: true, _id: { $ne: exceptId } })).map((u) => u.email);

// ---------- Rotas ----------
router.post(
  '/',
  upload.array('receipts', 5),
  wrap(async (req, res) => {
    const files = req.files || [];
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'Dados inválidos: ' + parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '));
      if (!files.length) throw new HttpError(400, 'Anexe ao menos um recibo');
      for (const f of files) {
        if (!magicOk(f)) throw new HttpError(400, `O arquivo "${f.originalname}" não corresponde ao tipo declarado`);
      }
      const receipts = files.map((f) => ({
        originalName: path.basename(f.originalname).replace(/[<>"'`\\/]/g, '_').slice(0, 200),
        storedName: f.filename,
        mime: f.mimetype,
        size: f.size,
        sha256: sha256File(f.path),
      }));
      const e = await Expense.create({ ...parsed.data, owner: req.user._id, receipts });
      audit(req, 'DESPESA_SUBMETIDA', { receipts: receipts.length }, req.user._id, e._id);
      notify(
        await managersEmails(req.user._id),
        'Nova despesa para validação',
        `${req.user.name} submeteu a despesa "${e.title}" (R$ ${e.amount.toFixed(2)}).\nAcesse: ${cfg.appUrl}/pendingExpenses/`
      );
      res.status(201).json(serialize(e));
    } catch (err) {
      files.forEach((f) => fs.unlink(f.path, () => {})); // não deixa arquivo órfão se algo falhar
      throw err;
    }
  })
);

// Funcionário vê só as próprias despesas; gerente vê todas. ?status=A,B filtra.
router.get(
  '/',
  validate(
    z.object({
      status: z.string().optional().transform((s) => (s ? s.split(',') : [])).pipe(z.array(z.enum(STATUS))),
    }),
    'query'
  ),
  wrap(async (req, res) => {
    const filter = {};
    if (req.user.role !== 'gerente') filter.owner = req.user._id;
    if (req.query.status.length) filter.status = { $in: req.query.status };
    const list = await Expense.find(filter).sort({ createdAt: -1 }).limit(200).populate('owner', 'name email').populate('validation.by', 'name').lean();
    res.json(list.map(serialize));
  })
);

router.get(
  '/:id',
  wrap(async (req, res) => {
    const { e } = await loadForUser(req);
    await e.populate([{ path: 'owner', select: 'name email' }, { path: 'validation.by', select: 'name' }]);
    res.json(serialize(e));
  })
);

router.get(
  '/:id/receipts/:idx',
  wrap(async (req, res) => {
    const { e } = await loadForUser(req);
    const r = e.receipts[Number(req.params.idx)];
    if (!r) throw new HttpError(404, 'Recibo não encontrado');
    res.attachment(r.originalName);
    res.type(r.mime);
    res.sendFile(path.resolve(cfg.uploadDir, r.storedName));
  })
);

// Gerente valida (aprova/rejeita). Segregação de funções: não valida a própria despesa.
router.post(
  '/:id/validate',
  requireRole('gerente'),
  validate(z.object({ decision: z.enum(['approve', 'reject']), note: text(0, 500).optional() })),
  wrap(async (req, res) => {
    const { e, isOwner } = await loadForUser(req);
    if (isOwner) throw new HttpError(403, 'Você não pode validar a sua própria despesa');
    if (e.status !== 'SUBMETIDA') throw new HttpError(409, 'Esta despesa não está aguardando validação');
    if (req.body.decision === 'reject' && !req.body.note) throw new HttpError(400, 'Informe o motivo da rejeição');
    if (!(await receiptsIntact(e))) throw new HttpError(409, 'Integridade dos recibos comprometida (hash divergente)');
    e.validation = { by: req.user._id, at: new Date(), decision: req.body.decision, note: req.body.note || '' };
    e.status = req.body.decision === 'approve' ? 'VALIDADA' : 'REJEITADA';
    await e.save();
    audit(req, e.status === 'VALIDADA' ? 'DESPESA_VALIDADA' : 'DESPESA_REJEITADA', {}, req.user._id, e._id);
    const owner = await User.findById(e.owner);
    notify(
      owner.email,
      e.status === 'VALIDADA' ? 'Despesa validada: assine o documento' : 'Despesa rejeitada',
      e.status === 'VALIDADA'
        ? `Sua despesa "${e.title}" foi validada. Assine digitalmente: ${cfg.appUrl}/signExpense/?id=${e._id}`
        : `Sua despesa "${e.title}" foi rejeitada.\nMotivo: ${e.validation.note}`
    );
    res.json({ status: e.status });
  })
);

// Texto exato que será assinado (o servidor é a fonte do documento canônico).
router.get(
  '/:id/sign-payload',
  wrap(async (req, res) => {
    const { e, isOwner } = await loadForUser(req);
    if (!isOwner) throw new HttpError(403, 'Somente o autor da despesa pode assiná-la');
    if (e.status !== 'VALIDADA') throw new HttpError(409, 'A despesa precisa estar validada para ser assinada');
    const payload = canonicalPayload(e);
    res.json({ payload, payloadHash: sha256Hex(payload) });
  })
);

router.post(
  '/:id/sign',
  validate(z.object({ signature: z.string().min(80).max(200), keyId: z.string().length(64) })),
  wrap(async (req, res) => {
    const { e, isOwner } = await loadForUser(req);
    if (!isOwner) throw new HttpError(403, 'Somente o autor da despesa pode assiná-la');
    if (e.status !== 'VALIDADA') throw new HttpError(409, 'A despesa precisa estar validada para ser assinada');
    const user = await User.findById(req.user._id);
    const key = user.activeKey();
    if (!key || key.keyId !== req.body.keyId) throw new HttpError(409, 'A chave usada não é a sua chave ativa. Gere/registre uma chave neste navegador.');
    if (!(await receiptsIntact(e))) throw new HttpError(409, 'Integridade dos recibos comprometida (hash divergente)');

    const payload = canonicalPayload(e); // recalculado no servidor: não confia no que o cliente diz ter assinado
    if (!verifyEcdsa(key.spki, payload, req.body.signature)) throw new HttpError(400, 'Assinatura digital inválida');

    e.signature = {
      signer: user._id,
      keyId: key.keyId,
      spki: key.spki,
      algorithm: 'ECDSA-P256-SHA256',
      payload,
      payloadHash: sha256Hex(payload),
      signature: req.body.signature,
      signedAt: new Date(),
      ip: req.ip,
    };
    e.status = 'ASSINADA';
    await e.save();
    audit(req, 'DESPESA_ASSINADA', { keyId: key.keyId, payloadHash: e.signature.payloadHash }, user._id, e._id);
    notify(
      await managersEmails(user._id),
      'Documento assinado digitalmente',
      `${user.name} assinou a despesa "${e.title}". Verifique a assinatura: ${cfg.appUrl}/verifySignature/?id=${e._id}`
    );
    res.json({ status: e.status, signedAt: e.signature.signedAt });
  })
);

module.exports = router;
