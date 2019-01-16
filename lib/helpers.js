'use strict';

var JsSignatureProvider = require('eosjs/dist/eosjs-jssig').default;
var ecc = require('eosjs-ecc');

function generateAccount(seed) {
  var key = ecc.seedPrivate(seed);
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
