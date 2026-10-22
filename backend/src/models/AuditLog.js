const { Schema, model } = require('mongoose');

// Trilha de auditoria append-only: não existe rota de edição/remoção.
const auditSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    expense: { type: Schema.Types.ObjectId, ref: 'Expense' },
    ip: String,
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = model('AuditLog', auditSchema);
