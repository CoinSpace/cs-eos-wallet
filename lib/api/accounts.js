'use strict';

const { getRequest } = require('./utils');

class Accounts {
  constructor(url) {
    this.url = url;
  }
  validate(accountName, publicKey) {
    const self = this;
    if (!accountName) {
      return Promise.resolve(false);
    }
    return validateAccountName(accountName).then(() => {
      return getRequest(self.url + 'account/' + accountName + '/validate/' + publicKey).then((data) => {
        return data.isValid;
      });
    });
  }
  info(accountName) {
    const self = this;
    return validateAccountName(accountName).then(() => {
      return getRequest(self.url + 'account/' + accountName).then((data) => {
        return {
          balance: data.balance,
          isActive: data.isActive,
        };
      });
    });
  }
  txs(accountName, cursor) {
    const self = this;
    return validateAccountName(accountName).then(() => {
      return getRequest(self.url + 'account/' + accountName + '/txs', { cursor })
        .then((data) => {
          const hasMoreTxs = data.txs.length === data.limit;
          const txs = data.txs.filter((tx) => {
            return tx.isEosTransfer;
          });
          return {
            txs,
            hasMoreTxs,
            cursor: data.txs.length,
          };
        });
    });
  }
}

function validateAccountName(name) {
  return new Promise((resolve, reject) => {
    if (/^([a-z1-5]){12}$/.test(name)) {
      resolve();
    } else {
      reject(new Error('Invalid account name'));
    }
  });
}

module.exports = Accounts;
