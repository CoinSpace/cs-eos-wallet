'use strict';

const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const ecc = require('eosjs-ecc');

function generateAccount(seed, publicKey) {
  if (!seed) {
    return {
      owner: {
        privateKey: null,
        publicKey,
      },
      active: {
        privateKey: null,
        publicKey,
      },
      name: '',
      signatureProvider: null,
    };
  }
  const key = ecc.seedPrivate(seed);
  publicKey = ecc.privateToPublic(key);
  return {
    owner: {
      privateKey: key,
      publicKey,
    },
    active: {
      privateKey: key,
      publicKey,
    },
    name: '',
    signatureProvider: new JsSignatureProvider([key]),
  };
}

function generateAccountFromPrivateKey(key) {
  const pubKey = ecc.privateToPublic(key);
  return {
    owner: {
      privateKey: key,
      publicKey: pubKey,
    },
    active: {
      privateKey: key,
      publicKey: pubKey,
    },
    name: '',
    signatureProvider: new JsSignatureProvider([key]),
  };
}

module.exports = {
  generateAccount,
  generateAccountFromPrivateKey,
};
