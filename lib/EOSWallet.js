import { getKeypairFromSeed } from './helpers.js';

import {
  Amount,
  CsWallet,
} from '@coinspace/cs-common';

export default class EOSWallet extends CsWallet {
  #balance = 0n;
  #publicKey;
  #accountName;

  constructor(options = {}) {
    super(options);
  }

  get address() {
    return this.#accountName || '';
  }

  get balance() {
    return new Amount(this.#balance, this.crypto.decimals);
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

  async load() {
    this.state = CsWallet.STATE_LOADED;
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
}
