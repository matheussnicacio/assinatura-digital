const { Schema, model } = require('mongoose');

const keySchema = new Schema(
  {
    keyId: { type: String, required: true }, // SHA-256 (hex) da chave pública SPKI
    spki: { type: String, required: true }, // chave pública ECDSA P-256, SPKI em base64
    createdAt: { type: Date, default: Date.now },
    revokedAt: Date,
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    cargo: { type: String, trim: true, maxlength: 80, default: '' },
    role: { type: String, enum: ['funcionario', 'gerente'], default: 'funcionario' },
    passwordHash: { type: String, required: true, select: false },
    active: { type: Boolean, default: true },
    failedLogins: { type: Number, default: 0 },
    lockUntil: Date,
    publicKeys: [keySchema],
  },
  { timestamps: true }
);

userSchema.methods.activeKey = function () {
  return [...this.publicKeys].reverse().find((k) => !k.revokedAt) || null;
};

userSchema.methods.toPublic = function () {
  const k = this.activeKey();
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    cargo: this.cargo,
    role: this.role,
    active: this.active,
    activeKeyId: k ? k.keyId : null,
    createdAt: this.createdAt,
  };
};

module.exports = model('User', userSchema);
