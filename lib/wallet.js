import API from './api/index.js';
import {
  getKeypairFromSeed,
  getPublicKeyFromSeed,
  getSignatureProviderFromSeed,
} from './helpers.js';
import {
  validateAccountName,
  validateMemo,
} from './validator.js';

import {
  Amount,
  CsWallet,
  Transaction,
  errors,
  utils,
} from 'cs-common';

export class InvalidMemoError extends errors.InvalidMetaError {
  name = 'InvalidMemoError';
  constructor(memo, options) {
    super(`Invalid Memo: "${memo}"`, {
      ...options,
      meta: 'memo',
    });
  }
}

export class InvalidAccountNameError extends TypeError {
  name = 'InvalidAccountNameError';
  constructor(accountName, options) {
    super(`Invalid account name "${accountName}"`, options);
  }
}

export class AccountNameUnavailableError extends TypeError {
  name = 'AccountNameUnavailableError';
  constructor(accountName, options) {
    super(`Account name "${accountName}" is already taken`, options);
  }
}

export class DestinationAcountError extends Error {
  name = 'DestinationAcountError';
}

export class ExpiredTransactionError extends Error {
  name = 'ExpiredTransactionError';
}

export class CPUExceededError extends Error {
  name = 'CPUUsageExceededError';
}

export class NETExceededError extends Error {
  name = 'NETExceededError';
}

class EOSTransaction extends Transaction {
  get url() {
    if (this.development) {
      return `https://jungle3.bloks.io/transaction/${this.id}`;
    }
    return `https://bloks.io/transaction/${this.id}`;
  }
}

const ZERO_FEE = 0n;

export default class EOSWallet extends CsWallet {
  #api;
  #dustThreshold = 1n;
  #balance = 0n;
  #isActive = false;
  #chainId;
  #publicKey;
  #accountName;

  static STATE_NEED_ACTIVATION = Symbol('STATE_NEED_ACTIVATION');

  get isMetaSupported() {
    return true;
  }

  constructor(options = {}) {
    super(options);
    this.#api = new API(this);
    if (options.development) {
      this.#chainId = options.chainId || '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd';
    } else {
      this.#chainId = options.chainId || 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
    }
  }

  get address() {
    return this.#accountName || '';
  }

  get balance() {
    return new Amount(this.#balance, this.crypto.decimals);
  }

  get states() {
    return [...super.states, EOSWallet.STATE_NEED_ACTIVATION];
  }

  async create(seed) {
    this.state = CsWallet.STATE_INITIALIZING;
    this.typeSeed(seed);
    this.#publicKey = getPublicKeyFromSeed(seed);
    await this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  async open(publicKey) {
    /**
     * begin migration from string
     */
    if (typeof publicKey === 'string') {
      publicKey = {
        data: publicKey,
      };
    }
    // end migration
    this.typePublicKey(publicKey);
    this.state = CsWallet.STATE_INITIALIZING;
    this.#publicKey = publicKey.data;
    await this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  async #init() {
    this.#balance = BigInt(this.storage.get('balance') || 0);
  }

  async setupAccount(accountName) {
    const isValid = await this.#api.accounts.validate(accountName, this.#publicKey);
    if (isValid) {
      this.#accountName = accountName;
      await this.storage.set('accountName', accountName);
      return { needToCreateAccount: false };
    }
    if (!validateAccountName(accountName)) {
      throw new InvalidAccountNameError(accountName);
    }
    const data = await this.#api.accounts.info(accountName);
    if (data.isActive) {
      throw new AccountNameUnavailableError(accountName);
    }
    const price = await this.#api.common.accountSetupPrice();
    return {
      needToCreateAccount: true,
      price,
      memo: accountName + '-' + this.#publicKey,
    };
  }

  async load() {
    this.state = CsWallet.STATE_LOADING;
    this.#accountName = await this.storage.get('accountName');
    if (!this.#accountName) {
      this.#accountName = await this.#api.accounts.accountNameByKey(this.#publicKey);
      await this.storage.set('accountName', this.#accountName);
    }
    const isValid = await this.#api.accounts.validate(this.#accountName, this.#publicKey);
    if (isValid) {
      const info = await this.#api.accounts.info(this.#accountName);
      this.#balance = this.#unitToAtom(info.balance);
      this.#isActive = info.isActive;
      this.storage.set('balance', this.#balance.toString());
      await this.storage.save();
      this.state = CsWallet.STATE_LOADED;
    } else {
      this.state = EOSWallet.STATE_NEED_ACTIVATION;
    }
  }

  async reload() {
    // TODO reload logic
  }

  async cleanup() {
    await super.cleanup();
  }

  async loadTransactions({ cursor } = {}) {
    if (!this.#isActive) {
      return {
        transactions: [],
        hasMore: false,
        cursor: 0,
      };
    }
    const data = await this.#api.accounts.txs(this.#accountName, cursor);
    return {
      transactions: data.txs.map((tx) => {
        return new EOSTransaction({
          type: EOSTransaction.TYPE_TRANSFER,
          id: tx.id,
          to: tx.to,
          from: tx.from,
          amount: new Amount(this.#unitToAtom(tx.amount), this.crypto.decimals),
          incoming: tx.to === this.#accountName && tx.from !== tx.to,
          fee: new Amount(ZERO_FEE, this.crypto.decimals),
          timestamp: new Date(tx.timestamp),
          confirmed: true,
          meta: {
            memo: tx.memo,
          },
          development: this.development,
        });
      }),
      hasMore: data.hasMore,
      cursor: data.cursor,
    };
  }

  getPublicKey() {
    return {
      data: this.#publicKey,
    };
  }

  getPrivateKey(seed) {
    this.typeSeed(seed);
    const keypair = getKeypairFromSeed(seed);
    return [{
      ownerPrivateKey: keypair.privateKey,
      ownerPublicKey: keypair.publicKey,
      activePrivateKey: keypair.privateKey,
      activePublicKey: keypair.publicKey,
    }];
  }

  async validateAddress({ address }) {
    super.validateAddress({ address });
    if (!validateAccountName(address)) {
      throw new errors.InvalidAddressError(address);
    }
    if (address === this.#accountName) {
      throw new errors.DestinationEqualsSourceError();
    }
    return true;
  }

  async validateMeta({ address, meta = {} }) {
    super.validateMeta({ address, meta });
    if (meta.memo !== undefined && !validateMemo(meta.memo)) {
      throw new InvalidMemoError(meta.memo);
    }
    return true;
  }

  async validateAmount({ address, meta = {}, amount }) {
    super.validateAmount({ address, meta, amount });
    if (!this.#isActive) {
      throw new errors.InactiveAccountError();
    }
    const { value } = amount;
    if (value < this.#dustThreshold) {
      throw new errors.SmallAmountError(new Amount(this.#dustThreshold, this.crypto.decimals));
    }
    if (value > this.#balance) {
      throw new errors.BigAmountError(new Amount(this.#balance, this.crypto.decimals));
    }
    return true;
  }

  async estimateMaxAmount({ address, meta = {} }) {
    super.estimateMaxAmount({ address, meta });
    return new Amount(this.#balance, this.crypto.decimals);
  }

  async estimateTransactionFee({ address, meta = {}, amount }) {
    super.estimateTransactionFee({ address, meta, amount });
    return new Amount(ZERO_FEE, this.crypto.decimals);
  }

  async createTransaction({ address, meta = {}, amount }, seed) {
    super.createTransaction({ address, amount }, seed);
    const { value } = amount;

    const tx = [{
      account: 'eosio.token',
      name: 'transfer',
      authorization: [{
        actor: this.#accountName,
        permission: 'active',
      }],
      data: {
        from: this.accountName,
        to: address,
        quantity: this.#atomToUnit(value) + ' EOS',
        memo: meta.memo,
      },
    }];

    const serializedTransaction = await this.#api.transactions.serialize(tx);
    const signatureProvider = getSignatureProviderFromSeed(seed);
    const pushTransactionArgs = await signatureProvider.sign({
      chainId: this.#chainId,
      requiredKeys: signatureProvider.availableKeys,
      serializedTransaction: Buffer.from(serializedTransaction, 'hex'),
    });
    try {
      await this.#api.transactions.propagate(pushTransactionArgs);
      this.#balance = this.#balance - value;
      this.storage.set('balance', this.#balance.toString());
    } catch (err) {
      if (err.response && /^Account does not exist/.test(err.response.data)) {
        throw new DestinationAcountError(err.response.data);
      } else if (err.response && /^Expired transaction/.test(err.response.data)) {
        throw new ExpiredTransactionError(err.response.data);
      } else if (err.response && /^CPU usage exceeded/.test(err.response.data)) {
        throw new CPUExceededError(err.response.data);
      } else if (err.response && /^NET usage exceeded/.test(err.response.data)) {
        throw new NETExceededError(err.response.data);
      }
      throw err;
    }
    // TODO should we return a transaction? => NO
  }

  #atomToUnit(value) {
    return utils.atomToUnit(value, this.crypto.decimals);
  }

  #unitToAtom(value) {
    return utils.unitToAtom(value, this.crypto.decimals);
  }
}
