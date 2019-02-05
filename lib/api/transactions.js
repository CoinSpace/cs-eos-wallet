'use strict';

var postRequest = require('./utils').postRequest;
var Buffer = require('safe-buffer').Buffer;

function Transactions(url) {
  this.url = url;
}

Transactions.prototype.serialize = function(tx) {
  return postRequest(this.url + 'tx/serialize', {tx: tx}).then(function(data) {
    return Promise.resolve(data.serializedTransaction);
  });
};

Transactions.prototype.propagate = function(pushTransactionArgs) {
  return postRequest(this.url + 'tx/send', {
    serializedTransaction: Buffer.from(pushTransactionArgs.serializedTransaction).toString('hex'),
    signatures: pushTransactionArgs.signatures
  }, true).then(function(data) {
    return Promise.resolve(data.txId);
  });
};

module.exports = Transactions;
