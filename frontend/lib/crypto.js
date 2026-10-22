// Assinatura digital no navegador com a Web Cryptography API (ECDSA P-256 + SHA-256).
// A chave PRIVADA é criada como NÃO EXTRAÍVEL e guardada no IndexedDB: nem o servidor nem scripts
// conseguem exportá-la. Isso sustenta o não repúdio: só este navegador consegue assinar.
const DB = 'assinatura-digital';
const STORE = 'keys';
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const enc = (s) => new TextEncoder().encode(s);

function openDb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'userId' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const hasWebCrypto = () => typeof crypto !== 'undefined' && !!crypto.subtle;

export async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']); // privada não extraível
  const spki = toB64(await crypto.subtle.exportKey('spki', kp.publicKey));
  return { privateKey: kp.privateKey, spki };
}

export const saveKey = (userId, keyId, privateKey) => withStore('readwrite', (s) => s.put({ userId, keyId, privateKey }));
export const loadKey = (userId) => withStore('readonly', (s) => s.get(userId));

export async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', enc(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signPayload(privateKey, payload) {
  return toB64(await crypto.subtle.sign(SIGN, privateKey, enc(payload)));
}

// Verificação independente no navegador (não depende do veredito do servidor).
export async function verifyPayload(spkiB64, payload, signatureB64) {
  const key = await crypto.subtle.importKey('spki', fromB64(spkiB64), ALG, false, ['verify']);
  return crypto.subtle.verify(SIGN, key, fromB64(signatureB64), enc(payload));
}
