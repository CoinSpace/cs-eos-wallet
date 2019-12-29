'use strict';

var getRequest = require('./utils').getRequest;

function Accounts(url) {
  this.url = url;
}

function validateAccountName(name) {
  return new Promise(function(resolve, reject) {
    if (/^([a-z1-5]){12}$/.test(name)) {
      resolve();
    } else {
      reject(new Error('Invalid account name'));
    }
  });
}

Accounts.prototype.validate = function(accountName, publicKey) {
  var self = this;
  if (!accountName) return Promise.resolve(false);
  return validateAccountName(accountName).then(function() {
    return getRequest(self.url + 'account/' + accountName + '/validate/' + publicKey).then(function(data) {
      return data.isValid;
    });
  });
};

Accounts.prototype.info = function(accountName) {
  var self = this;
  return validateAccountName(accountName).then(function() {
    return getRequest(self.url + 'account/' + accountName).then(function(data) {
      return {
        balance: data.balance,
        isActive: data.isActive
      };
    });
  });
};

Accounts.prototype.txs = function(accountName, cursor) {
  var self = this;
  return validateAccountName(accountName).then(function() {
    return getRequest(self.url + 'account/' + accountName + '/txs', {cursor: cursor})
      .then(function(data) {
        var hasMoreTxs = data.txs.length === data.limit;
        var txs = data.txs.filter(function(tx) {
          return tx.isEosTransfer;
        });
        return {
          txs: txs,
          hasMoreTxs: hasMoreTxs,
          cursor: data.txs.length
        };
      });
  });
};

module.exports = Accounts;
