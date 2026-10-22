const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { verifyEcdsa, keyFingerprint } = require('../src/services/crypto');

test('verifica assinatura ECDSA P-256 no formato produzido pela Web Crypto API (P1363)', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const spki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const payload = '{"expenseId":"1","amount":"10.00"}';
  const sig = crypto.sign('sha256', Buffer.from(payload), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64');

  assert.ok(verifyEcdsa(spki, payload, sig), 'assinatura legítima deve validar');
  assert.ok(!verifyEcdsa(spki, payload.replace('10.00', '99.00'), sig), 'documento alterado deve falhar');
  assert.equal(keyFingerprint(spki).length, 64);
});

test('rejeita chave que não seja P-256', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp384r1' });
  const spki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const sig = crypto.sign('sha256', Buffer.from('x'), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64');
  assert.equal(verifyEcdsa(spki, 'x', sig), false);
});
