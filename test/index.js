'use strict';

var assert = require('assert');
var Wallet = require('../');
var fixtures = require('./wallet');
// eslint-disable-next-line max-len
var RANDOM_SEED = '2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874';

describe('EOS Wallet', function() {
  var readOnlyWallet;

  before(function() {
    readOnlyWallet = Wallet.deserialize(JSON.stringify(fixtures));
  });

  it('should have more tests', function() {
    assert.equal('hi', 'hi');
  });

  describe('constructor', function() {
    it('with seed', function() {
      var wallet = new Wallet({
        networkName: 'eos',
        seed: RANDOM_SEED
      });
      assert.ok(wallet);
      assert.equal(wallet.isLocked, false);
    });

    it('with publicKey', function() {
      var wallet = new Wallet({
        networkName: 'eos',
        publicKey: readOnlyWallet.account.owner.publicKey
      });
      assert.equal(wallet.account.owner.publicKey, readOnlyWallet.account.owner.publicKey);
      assert.equal(wallet.account.active.publicKey, readOnlyWallet.account.active.publicKey);
      assert.equal(wallet.isLocked, true);
      assert.ok(wallet);
    });
  });

  describe('lock', function() {
    it('works', function() {
      var wallet = new Wallet({
        networkName: 'eos',
        seed: RANDOM_SEED
      });
      assert.equal(wallet.isLocked, false);
      wallet.lock();
      assert.equal(wallet.account.owner.privateKey, null);
      assert.equal(wallet.account.active.privateKey, null);
      assert.equal(wallet.account.signatureProvider, null);
      assert.equal(wallet.isLocked, true);
    });
  });

  describe('unlock', function() {
    it('works', function() {
      var account = readOnlyWallet.account;
      var wallet = new Wallet({
        networkName: 'eos',
        publicKey: account.owner.publicKey
      });
      assert.equal(wallet.isLocked, true);
      wallet.unlock(account.owner.privateKey);

      assert.equal(wallet.account.owner.privateKey, account.owner.privateKey);
      assert.equal(wallet.account.active.privateKey, account.active.privateKey);
      assert.equal(wallet.account.signatureProvider.availableKeys[0], account.signatureProvider.availableKeys[0]);

      assert.equal(wallet.isLocked, false);
    });
  });

  describe('dumpKeys', function() {
    it('works', function() {
      var wallet = new Wallet({
        networkName: 'eos',
        seed: RANDOM_SEED
      });
      var keys = wallet.dumpKeys();
      assert.ok(keys);
      assert.ok(keys.private);
      assert.ok(keys.public);
    });

    it('dumped keys are valid', function() {
      var wallet = new Wallet({
        networkName: 'eos',
        seed: RANDOM_SEED
      });
      var keys = wallet.dumpKeys();
      var secondWalet = new Wallet({
        networkName: 'eos',
        publicKey: keys.public
      });
      secondWalet.unlock(keys.private);

      var secondAccount = secondWalet.account;
      assert.equal(wallet.account.owner.privateKey, secondAccount.owner.privateKey);
      assert.equal(wallet.account.active.privateKey, secondAccount.active.privateKey);
      assert.equal(wallet.account.signatureProvider.availableKeys[0], secondAccount.signatureProvider.availableKeys[0]);
    });
  });

  describe('serialization & deserialization', function() {
    it('works', function() {
      assert.deepEqual(fixtures, JSON.parse(readOnlyWallet.serialize()));
    });
  });

  describe('exportPrivateKeys', function() {
    it('works', function() {
      var csv = readOnlyWallet.exportPrivateKeys();
      assert.equal(typeof csv, 'string');
      var str = 'ownerPrivateKey,ownerPublicKey,activePrivateKey,activePublicKey\n';
      str += readOnlyWallet.account.owner.privateKey + ',' + readOnlyWallet.account.owner.publicKey + ',';
      str += readOnlyWallet.account.active.privateKey + ',' + readOnlyWallet.account.active.publicKey;
      assert.equal(csv, str);
    });
  });

});
