'use strict';

const API = require('./api');
const validator = require('./validator');
const helpers = require('./helpers');
const Big = require('big.js');

class Wallet {
  constructor(options) {

    if (!options) {
      return this;
    }

    const { seed, publicKey, crypto, cache } = options;

    this.crypto = crypto;
    this.cache = cache;
    this._balance = this.cache.get('balance') || '0';
    this.factor = Big(10).pow(this.crypto.decimals);
    this.api = new API();
    this.fee = '0';
    this.isActive = false;
    this.txsCursor = 0;
    this.dustThreshold = 0.0001;
    this.isLocked = !seed;
    this.accountName = options.accountName;

    if (options.useTestNetwork) {
      this.chainId = '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840';
    } else {
      this.chainId = options.chainId || 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
    }

    if (seed) {
      this.account = helpers.generateAccount(seed);
    } else if (publicKey) {
      this.account = helpers.generateAccount(null, publicKey);
    } else {
      throw new Error('seed or publicKey should be passed');
    }
  }
  setupAccount(accountName) {
    return this.api.accounts.validate(accountName, this.account.owner.publicKey).then((isValid) => {
      if (isValid) {
        return {
          needToCreateAccount: false,
        };
      }
      return this.api.accounts.info(accountName).then((data) => {
        if (data.isActive) {
          throw new Error('Account name is already taken');
        }
        return this.api.common.accountSetupPrice().then((price) => {
          return {
            needToCreateAccount: true,
            price,
            memo: accountName + '-' + this.account.owner.publicKey,
          };
        });
      });
    });
  }
  async load() {
    const isValid = await this.api.accounts.validate(this.accountName, this.account.owner.publicKey);
    if (!isValid) {
      return this;
    }
    this.account.name = this.accountName;
    const data = await this.api.accounts.info(this.account.name);
    this.isActive = data.isActive;
    this._balance = data.balance;
    this.cache.set('balance', this._balance);
    return this;
  }
  async loadTxs() {
    if (!this.isActive) {
      return {
        txs: [],
        hasMoreTxs: false,
        cursor: 0,
      };
    }
    const data = await this.api.accounts.txs(this.account.name, this.txsCursor);
    data.txs = data.txs.map((tx) => {
      if (tx.from === this.account.name) {
        tx.amount = '-' + tx.amount;
      }
      tx.amount = this._unitToAtom(tx.amount);
      tx.isIncoming = tx.to === this.account.name && tx.from !== tx.to;
      return tx;
    });
    this.txsCursor += data.cursor;
    return data;
  }
  lock() {
    this.account.owner.privateKey = null;
    this.account.active.privateKey = null;
    this.account.signatureProvider = null;
    this.isLocked = true;
  }
  unlock(seed) {
    this.account = helpers.generateAccount(seed);
    this.account.name = this.accountName;
    this.isLocked = false;
  }
  publicKey() {
    return this.account.owner.publicKey;
  }
  get balance() {
    return this._unitToAtom(this._balance);
  }
  getNextAddress() {
    return this.account.name;
  }
  createTx(to, value, memo) {
    validator.preCreateTx({
      wallet: this,
      to,
      value: this._atomToUnit(value),
      memo,
    });

    const tx = [{
      account: 'eosio.token',
      name: 'transfer',
      authorization: [{
        actor: this.account.name,
        permission: 'active',
      }],
      data: {
        from: this.account.name,
        to,
        quantity: this._atomToUnit(value) + ' EOS',
        memo,
      },
    }];

    const that = this;
    return {
      sign() {
        return {
          data: tx,
          signatureProvider: that.account.signatureProvider,
        };
      },
    };
  }
  get defaultFee() {
    return this._unitToAtom(this.fee);
  }
  get maxAmount() {
    return this._unitToAtom(this._balance);
  }
  async sendTx(tx) {
    try {
      const serializedTransaction = await this.api.transactions.serialize(tx.data);
      const requiredKeys = tx.signatureProvider.availableKeys;
      const pushTransactionArgs = await tx.signatureProvider.sign({
        chainId: this.chainId,
        requiredKeys,
        serializedTransaction: Buffer.from(serializedTransaction, 'hex'),
      });
      await this.api.transactions.propagate(pushTransactionArgs);
      this._balance = Big(this._balance).minus(tx.data[0].data.quantity.split(' ')[0]).toFixed();
      this.cache.set('balance', this._balance);
    } catch (err) {
      if (err.response && /^Account does not exist/.test(err.response.data)) {
        throw new Error(err.response.data);
      } else if (err.response && /^Expired transaction/.test(err.response.data)) {
        throw new Error(err.response.data);
      } else if (err.response && /^CPU usage exceeded/.test(err.response.data)) {
        throw new Error(err.response.data);
      } else if (err.response && /^NET usage exceeded/.test(err.response.data)) {
        throw new Error(err.response.data);
      }
      throw new Error('cs-node-error');
    }
  }
  isReceivedTx(tx) {
    return tx && tx.to === this.account.name;
  }
  exportPrivateKeys() {
    let str = 'ownerPrivateKey,ownerPublicKey,activePrivateKey,activePublicKey\n';
    str += this.account.owner.privateKey + ',' + this.account.owner.publicKey + ',';
    str += this.account.active.privateKey + ',' + this.account.active.publicKey;
    return str;
  }
  txUrl(txId) {
    return `https://bloks.io/transaction/${txId}`;
  }
  _atomToUnit(value) {
    return Big(value).div(this.factor).toFixed(this.crypto.decimals);
  }
  _unitToAtom(value) {
    return Big(value).times(this.factor).toFixed(0);
  }
  serialize() {
    return JSON.stringify({
      crypto: this.crypto,
      chainId: this.chainId,
      balance: this._balance,
      isActive: this.isActive,
      fee: this.fee,
      accountName: this.account.name,
      privateKey: this.account.owner.privateKey,
      dustThreshold: this.dustThreshold,
      txsCursor: this.txsCursor,
    });
  }
  static deserialize(json) {
    const wallet = new Wallet();
    const deserialized = JSON.parse(json);

    wallet.crypto = deserialized.crypto;
    wallet.cache = { get: () => {}, set: () => {} };
    wallet.api = new API();
    wallet._balance = deserialized.balance;
    wallet.fee = deserialized.fee;

    const account = helpers.generateAccountFromPrivateKey(deserialized.privateKey);
    account.name = deserialized.accountName;
    wallet.account = account;

    wallet.dustThreshold = deserialized.dustThreshold;
    wallet.txsCursor = deserialized.txsCursor;

    return wallet;
  }
}

module.exports = Wallet;
