'use strict';

const { postRequest } = require('./utils');

class Transactions {
  constructor(url) {
    this.url = url;
  }
  serialize(tx) {
    return postRequest(this.url + 'tx/serialize', { tx }).then((data) => {
      return Promise.resolve(data.serializedTransaction);
    });
  }
  propagate(pushTransactionArgs) {
    return postRequest(this.url + 'tx/send', {
      serializedTransaction: Buffer.from(pushTransactionArgs.serializedTransaction).toString('hex'),
      signatures: pushTransactionArgs.signatures,
    }, true).then((data) => {
      return Promise.resolve(data.txId);
    });
  }
}

module.exports = Transactions;
