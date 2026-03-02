import Wallet from '@coinspace/cs-eos-wallet';
import assert from 'assert/strict';
import sinon from 'sinon';

import { hexToBytes } from '@noble/hashes/utils';

// eslint-disable-next-line max-len
const RANDOM_SEED = hexToBytes('2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874');
const PUBLIC_KEY = 'EOS7tJKsK8frEPribVBiQXByLkADnDUr3DUUr4LBzuThFPYk8EPSj';
const PRIVATE_KEY = '5J31TthDctkYwYVrDTcg8JmjmbK58UFzyPHBy9bzd5XFz2JKswJ';
const eosAtEos = {
  _id: 'eos@eos',
  asset: 'eos',
  platform: 'eos',
  type: 'coin',
  decimals: 4,
};
let defaultOptions;

describe('EOS Wallet', () => {
  beforeEach(() => {
    defaultOptions = {
      crypto: eosAtEos,
      platform: eosAtEos,
      cache: { get() {}, set() {} },
      settings: { get() {}, set() {} },
      request(...args) { console.log(args); },
      apiNode: 'node',
      storage: { get() {}, set() {}, save() {} },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('create wallet instance', () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      assert.equal(wallet.state, Wallet.STATE_CREATED);
    });
  });

  describe('create wallet', () => {
    it('should create new wallet with seed', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, '');
    });

    it('should fails without seed', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await assert.rejects(async () => {
        await wallet.create();
      }, {
        name: 'TypeError',
        message: 'seed must be an instance of Uint8Array or Buffer, undefined provided',
      });
    });
  });

  describe('open wallet', () => {
    it('should open wallet with public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, '');
    });

    it('should fails without public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await assert.rejects(async () => {
        await wallet.open();
      }, {
        name: 'TypeError',
        message: 'publicKey must be an instance of Object with data property',
      });
    });
  });

  describe('storage', () => {
    it('should load initial balance from storage', async () => {
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('balance').returns('1234567890');
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      assert.equal(wallet.balance.value, 1234567890n);
    });
  });

  describe('load', () => {
    it('should load wallet (need activation)', async () => {
      sinon.stub(defaultOptions, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/key/${PUBLIC_KEY}`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({});
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(undefined);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
    });
  });

  describe('getPublicKey', () => {
    it('should export public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      const publicKey = wallet.getPublicKey();
      assert.deepEqual(publicKey, { data: PUBLIC_KEY });
    });
  });

  describe('getPrivateKey', () => {
    it('should export private key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      const privateKey = wallet.getPrivateKey(RANDOM_SEED);
      assert.deepEqual(privateKey, [{
        ownerPrivateKey: PRIVATE_KEY,
        ownerPublicKey: PUBLIC_KEY,
        activePrivateKey: PRIVATE_KEY,
        activePublicKey: PUBLIC_KEY,
      }]);
    });
  });

});
