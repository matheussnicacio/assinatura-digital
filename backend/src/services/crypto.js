const crypto = require('crypto');

const sha256Hex = (data) => crypto.createHash('sha256').update(data).digest('hex');

// Aceita somente chaves públicas ECDSA P-256 em formato SPKI (o que a Web Crypto API exporta).
function parseP256PublicKey(spkiB64) {
  const key = crypto.createPublicKey({ key: Buffer.from(spkiB64, 'base64'), format: 'der', type: 'spki' });
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails.namedCurve !== 'prime256v1') {
    throw new Error('A chave deve ser ECDSA P-256');
  }
  return key;
}

const keyFingerprint = (spkiB64) => sha256Hex(Buffer.from(spkiB64, 'base64'));

// A Web Crypto API gera assinaturas ECDSA em formato IEEE P1363 (r||s), por isso dsaEncoding.
function verifyEcdsa(spkiB64, payload, signatureB64) {
  try {
    const key = parseP256PublicKey(spkiB64);
    return crypto.verify(
      'sha256',
      Buffer.from(payload, 'utf8'),
      { key, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signatureB64, 'base64')
    );
  } catch {
    return false;
  }
}

module.exports = { sha256Hex, parseP256PublicKey, keyFingerprint, verifyEcdsa };
