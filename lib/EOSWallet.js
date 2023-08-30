import API from './api/API.js';
import {
  getKeypairFromSeed,
  sign,
} from './helpers.js';
import {
  validateAccountName,
  validateMemo,
} from './validator.js';

import * as errors from './errors.js';
import * as symbols from './symbols.js';

import {
  Amount,
  CsWallet,
  Transaction,
  utils,
} from '@coinspace/cs-common';

class EOSTransaction extends Transaction {
  get url() {
    if (this.development) {
      return `https://testnet.protonscan.io/transaction/${this.id}`;
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
  #symbol;
  #publicKey;
  #accountName;
  #transactions = new Map();

  static STATE_NEED_ACTIVATION = symbols.STATE_NEED_ACTIVATION;

  get isMetaSupported() {
    return true;
  }

  constructor(options = {}) {
    super(options);
    this.#api = new API(this);
    if (options.development) {
      this.#chainId = options.chainId || '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd';
      this.#symbol = 'XPR';
    } else {
      this.#chainId = options.chainId || 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
      this.#symbol = 'EOS';
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

  get metaNames() {
    return ['memo'];
  }

  get dummyExchangeDepositAddress() {
    return 'coinappfee55';
  }

  async create(seed) {
    this.state = CsWallet.STATE_INITIALIZING;
    this.typeSeed(seed);
    this.#publicKey = getKeypairFromSeed(seed).publicKey;
    await this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  async open(publicKey) {
    this.typePublicKey(publicKey);
    this.state = CsWallet.STATE_INITIALIZING;
    this.#publicKey = publicKey.data;
    await this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  async #init() {
    this.#balance = BigInt(this.storage.get('balance') || 0);
  }

  async cleanup() {
    await super.cleanup();
  }

  validateAccountName(accountName) {
    return validateAccountName(accountName);
  }

  async setupAccount(accountName) {
    const isValid = await this.#api.accounts.validate(accountName, this.#publicKey);
    if (isValid) {
      this.#accountName = accountName;
      this.storage.set('accountName', accountName);
      await this.storage.save();
      return { needToCreateAccount: false };
    }
    if (!validateAccountName(accountName)) {
      throw new errors.InvalidAccountNameError(accountName);
    }
    const data = await this.#api.accounts.info(accountName);
    if (data.isActive) {
      throw new errors.AccountNameUnavailableError(accountName);
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
    try {
      this.#accountName = this.storage.get('accountName');
      if (!this.#accountName) {
        this.#accountName = await this.#api.accounts.accountNameByKey(this.#publicKey);
        this.storage.set('accountName', this.#accountName);
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
    } catch (err) {
      this.state = CsWallet.STATE_ERROR;
      throw err;
    }
  }

  async loadTransactions({ cursor } = {}) {
    if (!cursor) {
      this.#transactions.clear();
    }
    if (!this.#isActive) {
      return {
        transactions: [],
        hasMore: false,
        cursor: 0,
      };
    }
    const data = await this.#api.accounts.txs(this.#accountName, cursor);
    const transactions = data.transactions.map((tx) => {
      return new EOSTransaction({
        type: EOSTransaction.TYPE_TRANSFER,
        status: EOSTransaction.STATUS_SUCCESS,
        id: tx.id,
        to: tx.to,
        from: tx.from,
        amount: new Amount(this.#unitToAtom(tx.amount), this.crypto.decimals),
        incoming: tx.to === this.#accountName && tx.from !== tx.to,
        fee: new Amount(ZERO_FEE, this.crypto.decimals),
        timestamp: new Date(tx.timestamp),
        meta: {
          memo: tx.memo,
        },
        development: this.development,
      });
    });
    for (const transaction of transactions) {
      this.#transactions.set(transaction.id, transaction);
    }
    return {
      transactions,
      hasMore: data.hasMore,
      cursor: data.cursor,
    };
  }

  async loadTransaction(id) {
    if (this.#transactions.has(id)) {
      return this.#transactions.get(id);
    }
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
      throw new errors.InvalidMemoError(meta.memo);
    }
    return true;
  }

  async validateAmount({ address, meta = {}, amount }) {
    super.validateAmount({ address, meta, amount });
    if (!this.#isActive) {
      throw new errors.SmallAmountError(new Amount(this.#dustThreshold, this.crypto.decimals));
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
        from: this.#accountName,
        to: address,
        quantity: `${this.#atomToUnit(value)} ${this.#symbol}`,
        memo: meta.memo || '',
      },
    }];

    const serializedTransaction = await this.#api.transactions.serialize(tx);
    const signature = sign({
      chainId: this.#chainId,
      serializedTransaction,
    }, seed);
    try {
      const id = await this.#api.transactions.propagate({
        serializedTransaction,
        signatures: [signature],
      });
      this.#balance = this.#balance - value;
      this.storage.set('balance', this.#balance.toString());
      await this.storage.save();
      return id;
    } catch (err) {
      if (err.response && /^Account does not exist/.test(err.response.data)) {
        throw new errors.DestinationAcountError(err.response.data);
      } else if (err.response && /^Expired transaction/.test(err.response.data)) {
        throw new errors.ExpiredTransactionError(err.response.data);
      } else if (err.response && /^CPU usage exceeded/.test(err.response.data)) {
        throw new errors.CPUExceededError(err.response.data);
      } else if (err.response && /^NET usage exceeded/.test(err.response.data)) {
        throw new errors.NETExceededError(err.response.data);
      }
      throw err;
    }
  }

  #atomToUnit(value) {
    return utils.atomToUnit(value, this.crypto.decimals);
  }

  #unitToAtom(value) {
    return utils.unitToAtom(value, this.crypto.decimals);
  }
}
