'use strict';

var JsSignatureProvider = require('eosjs/dist/eosjs-jssig').JsSignatureProvider;
var ecc = require('eosjs-ecc');

function generateAccount(seed, publicKey) {
  if (!seed) {
    return {
      owner: {
        privateKey: null,
        publicKey: publicKey
      },
      active: {
        privateKey: null,
        publicKey: publicKey
      },
      name: '',
      signatureProvider: null
    };
  }
  var key = ecc.seedPrivate(seed);
  publicKey = ecc.privateToPublic(key);
  return {
    owner: {
      privateKey: key,
      publicKey: publicKey
    },
    active: {
      privateKey: key,
      publicKey: publicKey
    },
    name: '',
    signatureProvider: new JsSignatureProvider([key])
  };
}

function generateAccountFromPrivateKey(key) {
  var pubKey = ecc.privateToPublic(key);
  return {
    owner: {
      privateKey: key,
      publicKey: pubKey
    },
    active: {
      privateKey: key,
      publicKey: pubKey
    },
    name: '',
    signatureProvider: new JsSignatureProvider([key])
  };
}

module.exports = {
  generateAccount: generateAccount,
  generateAccountFromPrivateKey: generateAccountFromPrivateKey
};
