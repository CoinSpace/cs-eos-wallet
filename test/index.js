'use strict';

const assert = require('assert');
const Wallet = require('../');
const fixtures = require('./wallet');
// eslint-disable-next-line max-len
const RANDOM_SEED = '2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874';
const RANDOM_SEED_PUB_KEY = 'EOS7tJKsK8frEPribVBiQXByLkADnDUr3DUUr4LBzuThFPYk8EPSj';
const defaultOptions = {
  crypto: {
    platform: 'eos',
    decimals: 4,
  },
  cache: { get: () => {}, set: () => {} },
};

describe('EOS Wallet', () => {
  let readOnlyWallet;

  before(() => {
    readOnlyWallet = Wallet.deserialize(JSON.stringify(fixtures));
  });

  it('should have more tests', () => {
    assert.equal('hi', 'hi');
  });

  describe('constructor', () => {
    it('with seed', () => {
      const wallet = new Wallet({
        ...defaultOptions,
        seed: RANDOM_SEED,
      });
      assert.ok(wallet);
      assert.equal(wallet.isLocked, false);
    });

    it('with publicKey', () => {
      const wallet = new Wallet({
        ...defaultOptions,
        publicKey: readOnlyWallet.account.owner.publicKey,
      });
      assert.equal(wallet.account.owner.publicKey, readOnlyWallet.account.owner.publicKey);
      assert.equal(wallet.account.active.publicKey, readOnlyWallet.account.active.publicKey);
      assert.equal(wallet.isLocked, true);
      assert.ok(wallet);
    });
  });

  describe('lock', () => {
    it('works', () => {
      const wallet = new Wallet({
        ...defaultOptions,
        seed: RANDOM_SEED,
      });
      assert.equal(wallet.isLocked, false);
      wallet.lock();
      assert.equal(wallet.account.owner.privateKey, null);
      assert.equal(wallet.account.active.privateKey, null);
      assert.equal(wallet.account.signatureProvider, null);
      assert.equal(wallet.isLocked, true);
    });
  });

  describe('unlock', () => {
    it('works', () => {
      const wallet = new Wallet({
        ...defaultOptions,
        publicKey: RANDOM_SEED_PUB_KEY,
      });
      assert.equal(wallet.isLocked, true);
      wallet.unlock(RANDOM_SEED);

      assert.ok(wallet.account.owner.privateKey);
      assert.ok(wallet.account.active.privateKey);
      assert.ok(wallet.account.signatureProvider.availableKeys[0]);

      assert.equal(wallet.isLocked, false);
    });
  });

  describe('publicKey', () => {
    it('works', () => {
      const wallet = new Wallet({
        ...defaultOptions,
        seed: RANDOM_SEED,
      });
      const publicKey = wallet.publicKey();
      assert.ok(publicKey);
    });

    it('key is valid', () => {
      const wallet = new Wallet({
        ...defaultOptions,
        seed: RANDOM_SEED,
      });
      const publicKey = wallet.publicKey();
      const secondWalet = new Wallet({
        ...defaultOptions,
        publicKey,
      });
      secondWalet.unlock(RANDOM_SEED);

      const secondAccount = secondWalet.account;
      assert.equal(wallet.account.owner.privateKey, secondAccount.owner.privateKey);
      assert.equal(wallet.account.active.privateKey, secondAccount.active.privateKey);
      assert.equal(wallet.account.signatureProvider.availableKeys[0], secondAccount.signatureProvider.availableKeys[0]);
    });
  });

  describe('serialization & deserialization', () => {
    it('works', () => {
      assert.deepEqual(fixtures, JSON.parse(readOnlyWallet.serialize()));
    });
  });

  describe('exportPrivateKeys', () => {
    it('works', () => {
      const csv = readOnlyWallet.exportPrivateKeys();
      assert.equal(typeof csv, 'string');
      let str = 'ownerPrivateKey,ownerPublicKey,activePrivateKey,activePublicKey\n';
      str += readOnlyWallet.account.owner.privateKey + ',' + readOnlyWallet.account.owner.publicKey + ',';
      str += readOnlyWallet.account.active.privateKey + ',' + readOnlyWallet.account.active.publicKey;
      assert.equal(csv, str);
    });
  });

});
