'use strict';

var assert = require('assert');
var API = require('./api');
var validator = require('./validator');
var helpers = require('./helpers');
var Big = require('big.js');

function Wallet(options) {
  if (arguments.length === 0) return this;

  var seed = options.seed;
  var done = options.done;

  try {
    assert(seed, 'seed cannot be empty');
  } catch (err) {
    return done(err);
  }

  this.networkName = options.networkName;
  this.api = new API();
  this.balance = '0';
  this.fee = '0';
  this.isActive = false;
  this.txsCursor = 0;
  this.chainId = options.chainId || 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
  this.account = helpers.generateAccount(seed);
  this.dustThreshold = 0.0001;

  var that = this;

  that.api.accounts.validate(options.accountName, that.account.owner.publicKey).then(function(isValid) {
    if (!isValid) {
      done(null, that);
      return;
    }
    that.account.name = options.accountName;
    return that.api.accounts.info(that.account.name).then(function(data) {
      that.isActive = data.isActive;
      that.balance = data.balance;
      done(null, that);
    });
  }).catch(done);
}

Wallet.prototype.setupAccount = function(accountName) {
  var that = this;
  return that.api.accounts.validate(accountName, that.account.owner.publicKey).then(function(isValid) {
    if (isValid) {
      return {
        needToCreateAccount: false
      };
    }
    return that.api.accounts.info(accountName).then(function(data) {
      if (data.isActive) {
        throw new Error('Account name is already taken');
      }
      return that.api.common.accountSetupPrice().then(function(price) {
        return {
          needToCreateAccount: true,
          price: price,
          memo: accountName + '-' + that.account.owner.publicKey
        };
      });
    });
  });
};

Wallet.prototype.loadTxs = function() {
  var that = this;
  if (!that.isActive) {
    return Promise.resolve({
      txs: [],
      hasMoreTxs: false,
      cursor: 0
    });
  }
  return this.api.accounts.txs(that.account.name, that.txsCursor).then(function(data) {
    data.txs = data.txs.map(function(tx) {
      if (tx.from === that.account.name) {
        tx.amount = '-' + tx.amount;
      }
      return tx;
    });
    that.txsCursor += data.cursor;
    return data;
  });
};

Wallet.prototype.getBalance = function() {
  return this.balance;
};

Wallet.prototype.getNextAddress = function() {
  return this.account.name;
};

Wallet.prototype.createTx = function(to, value, memo) {
  validator.preCreateTx({
    wallet: this,
    to: to,
    value: value,
    memo: memo
  });

  var tx = [{
    account: 'eosio.token',
    name: 'transfer',
    authorization: [{
      actor: this.account.name,
      permission: 'active',
    }],
    data: {
      from: this.account.name,
      to: to,
      quantity: Big(value).toFixed(4) + ' EOS',
      memo: memo,
    },
  }];

  return tx;
};

Wallet.prototype.getDefaultFee = function() {
  return this.fee;
};

Wallet.prototype.getMaxAmount = function() {
  return this.balance;
};

Wallet.prototype.sendTx = function(tx, done) {
  var that = this;
  that.api.transactions.serialize(tx).then(function(serializedTransaction) {
    var requiredKeys = that.account.signatureProvider.availableKeys;
    return that.account.signatureProvider.sign({
      chainId: that.chainId,
      requiredKeys: requiredKeys,
      serializedTransaction: Buffer.from(serializedTransaction, 'hex')
    });
  }).then(function(pushTransactionArgs) {
    return that.api.transactions.propagate(pushTransactionArgs).then(function() {
      that.balance = Big(that.balance).minus(tx[0].data.quantity.split(' ')[0]).toFixed();
      done(null);
    }).catch(function(err) {
      if (err.response && /^Account does not exist/.test(err.response.data)) {
        throw new Error('Destination account doesn\'t exist.');
      } else if (err.response && /^Expired transaction/.test(err.response.data)) {
        throw new Error('Transaction has been expired. Please try again.');
      } else if (err.response && /^CPU usage exceeded/.test(err.response.data)) {
        throw new Error('Account CPU usage has been exceeded. ' +
          'Please try again later or ask someone to stake you more CPU.');
      } else if (err.response && /^NET usage exceeded/.test(err.response.data)) {
        throw new Error('Account NET usage has been exceeded. ' +
          'Please try again later or ask someone to stake you more NET.');
      }
      throw new Error('cs-node-error');
    });
  }).catch(done);
};

Wallet.prototype.isReceivedTx = function(tx) {
  return tx && tx.to === this.account.name;
};

Wallet.prototype.exportPrivateKeys = function() {
  var str = 'ownerPrivateKey,ownerPublicKey,activePrivateKey,activePublicKey\n';
  str += this.account.owner.privateKey + ',' + this.account.owner.publicKey + ',';
  str += this.account.active.privateKey + ',' + this.account.active.publicKey;
  return str;
};

Wallet.prototype.serialize = function() {
  return JSON.stringify({
    networkName: this.networkName,
    chainId: this.chainId,
    balance: this.getBalance(),
    isActive: this.isActive,
    fee: this.getDefaultFee(),
    accountName: this.account.name,
    privateKey: this.account.owner.privateKey,
    dustThreshold: this.dustThreshold,
    txsCursor: this.txsCursor
  });
};

Wallet.deserialize = function(json) {
  var wallet = new Wallet();
  var deserialized = JSON.parse(json);

  wallet.networkName = deserialized.networkName;
  wallet.api = new API();
  wallet.balance = deserialized.balance;
  wallet.fee = deserialized.fee;

  var account = helpers.generateAccountFromPrivateKey(deserialized.privateKey);
  account.name = deserialized.accountName;
  wallet.account = account;

  wallet.dustThreshold = deserialized.dustThreshold;
  wallet.txsCursor = deserialized.txsCursor;

  return wallet;
};

module.exports = Wallet;
