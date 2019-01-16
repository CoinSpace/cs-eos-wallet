'use strict';

var assert = require('assert');
var Wallet = require('../');
var fixtures = require('./wallet');

describe('EOS Wallet', function() {
  var readOnlyWallet;

  before(function() {
    readOnlyWallet = Wallet.deserialize(JSON.stringify(fixtures));
  });

  it('should have more tests', function() {
    assert.equal('hi', 'hi');
  });

  describe('serialization & deserialization', function() {
    it('works', function() {
      assert.deepEqual(fixtures, JSON.parse(readOnlyWallet.serialize()));
    });
  });

  describe('exportPrivateKeys', function() {
    it.only('works', function() {
      var csv = readOnlyWallet.exportPrivateKeys();
      assert.equal(typeof csv, 'string');
      var str = 'ownerPrivateKey,ownerPublicKey,activePrivateKey,activePublicKey\n';
      str += readOnlyWallet.account.owner.privateKey + ',' + readOnlyWallet.account.owner.publicKey + ',';
      str += readOnlyWallet.account.active.privateKey + ',' + readOnlyWallet.account.active.publicKey;
      assert.equal(csv, str);
    });
  });

});
