const AuditLog = require('../models/AuditLog');

module.exports = function audit(req, action, meta = {}, actorId, expenseId) {
  AuditLog.create({
    action,
    actor: actorId || (req.user && req.user._id),
    expense: expenseId,
    ip: req.ip,
    meta,
  }).catch((e) => console.error('Falha ao gravar auditoria:', e.message));
};
