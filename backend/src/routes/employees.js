const router = require('express').Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Expense = require('../models/Expense');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, text, z } = require('../middleware/validate');
const { wrap, HttpError } = require('../utils');
const { notify } = require('../services/mailer');
const audit = require('../services/audit');

router.use(authenticate, requireRole('gerente'));
router.param('id', (req, res, next, id) =>
  mongoose.isValidObjectId(id) ? next() : res.status(400).json({ error: 'Identificador inválido' })
);

const password = z
  .string()
  .min(10, 'mínimo de 10 caracteres')
  .max(128)
  .regex(/[a-z]/, 'precisa de letra minúscula')
  .regex(/[A-Z]/, 'precisa de letra maiúscula')
  .regex(/\d/, 'precisa de número');

const base = {
  name: text(2, 120),
  email: z.string().email().max(200).transform((s) => s.toLowerCase()),
  cargo: text(0, 80).optional(),
  role: z.enum(['funcionario', 'gerente']),
  active: z.boolean().optional(),
};
const createSchema = z.object({ ...base, password });
const updateSchema = z.object(base).partial().extend({ password: password.optional() });

const dupGuard = (e) => {
  if (e.code === 11000) throw new HttpError(409, 'Já existe um funcionário com este e-mail');
  throw e;
};

router.get(
  '/',
  wrap(async (req, res) => {
    const users = await User.find().sort({ name: 1 });
    res.json(users.map((u) => u.toPublic()));
  })
);

router.get(
  '/:id',
  wrap(async (req, res) => {
    const u = await User.findById(req.params.id);
    if (!u) throw new HttpError(404, 'Funcionário não encontrado');
    res.json(u.toPublic());
  })
);

router.post(
  '/',
  validate(createSchema),
  wrap(async (req, res) => {
    const { password: pwd, ...data } = req.body;
    const user = await User.create({ ...data, passwordHash: await bcrypt.hash(pwd, 12) }).catch(dupGuard);
    audit(req, 'FUNCIONARIO_CRIADO', { id: String(user._id) });
    notify(user.email, 'Sua conta foi criada', `Olá, ${user.name}!\n\nSua conta foi criada no módulo de assinatura digital. Solicite a senha inicial ao gerente e altere-a no primeiro acesso.`);
    res.status(201).json(user.toPublic());
  })
);

router.put(
  '/:id',
  validate(updateSchema),
  wrap(async (req, res) => {
    const user = await User.findById(req.params.id).select('+passwordHash');
    if (!user) throw new HttpError(404, 'Funcionário não encontrado');
    const { password: pwd, ...data } = req.body;
    const self = String(user._id) === String(req.user._id);
    if (self && (data.active === false || (data.role && data.role !== 'gerente'))) {
      throw new HttpError(400, 'Você não pode desativar ou rebaixar a própria conta');
    }
    Object.assign(user, data);
    if (pwd) user.passwordHash = await bcrypt.hash(pwd, 12);
    await user.save().catch(dupGuard);
    audit(req, 'FUNCIONARIO_ATUALIZADO', { id: String(user._id) });
    res.json(user.toPublic());
  })
);

router.delete(
  '/:id',
  wrap(async (req, res) => {
    if (req.params.id === String(req.user._id)) throw new HttpError(400, 'Você não pode excluir a própria conta');
    const has = await Expense.exists({ owner: req.params.id });
    if (has) throw new HttpError(409, 'Funcionário possui despesas registradas: desative a conta em vez de excluir');
    const r = await User.findByIdAndDelete(req.params.id);
    if (!r) throw new HttpError(404, 'Funcionário não encontrado');
    audit(req, 'FUNCIONARIO_EXCLUIDO', { id: req.params.id });
    res.status(204).end();
  })
);

module.exports = router;
