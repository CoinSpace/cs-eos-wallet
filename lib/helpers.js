import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig.js';
import ecc from 'eosjs-ecc';

export function getKeypairFromSeed(seed) {
  const privateKey = ecc.seedPrivate(seed.toString('hex'));
  const publicKey = ecc.privateToPublic(privateKey);
  return {
    privateKey,
    publicKey,
  };
}

export function getPublicKeyFromSeed(seed) {
  const privateKey = ecc.seedPrivate(seed.toString('hex'));
  const publicKey = ecc.privateToPublic(privateKey);
  return publicKey;
}

export function getSignatureProviderFromSeed(seed) {
  const privateKey = ecc.seedPrivate(seed.toString('hex'));
  return new JsSignatureProvider([privateKey]);
}

export function utf8ToBytes(str) {
  if (typeof str !== 'string') {
    throw new TypeError(`utf8ToBytes expected string, got ${typeof str}`);
  }
  return new TextEncoder().encode(str);
}
