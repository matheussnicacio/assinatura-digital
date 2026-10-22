const { Schema, model } = require('mongoose');

const receiptSchema = new Schema(
  {
    originalName: String,
    storedName: String, // nome aleatório no disco (nunca o nome enviado pelo cliente)
    mime: String,
    size: Number,
    sha256: String, // hash do arquivo no momento do upload
  },
  { _id: false }
);

const expenseSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 2000 },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    receipts: [receiptSchema],
    status: {
      type: String,
      enum: ['SUBMETIDA', 'VALIDADA', 'REJEITADA', 'ASSINADA'],
      default: 'SUBMETIDA',
      index: true,
    },
    validation: {
      by: { type: Schema.Types.ObjectId, ref: 'User' },
      at: Date,
      decision: { type: String, enum: ['approve', 'reject'] },
      note: String,
    },
    signature: {
      signer: { type: Schema.Types.ObjectId, ref: 'User' },
      keyId: String,
      spki: String, // cópia da chave pública usada (prova independente da chave)
      algorithm: String,
      payload: String, // documento canônico que foi assinado
      payloadHash: String,
      signature: String, // base64 (ECDSA P-256 / SHA-256, formato IEEE P1363)
      signedAt: Date,
      ip: String,
    },
  },
  { timestamps: true }
);

module.exports = model('Expense', expenseSchema);
