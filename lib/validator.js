'use strict';

var Big = require('big.js');

function preCreateTx(params) {
  var to = params.to;
  var value = params.value;
  var memo = params.memo;
  var wallet = params.wallet;

  if (!wallet.isActive) {
    throw new Error('Inactive account');
  }

  if (memo && Buffer.byteLength(memo, 'utf8') > 256) {
    throw new Error('Invalid memo');
  }

  if (!/^([a-z1-5]){12}$/.test(to)) {
    throw new Error('Invalid address');
  }

  if (wallet.account.name === to) {
    throw new Error('Destination address equal source address');
  }

  var error;

  if (value <= wallet.dustThreshold) {
    error = new Error('Invalid value');
    error.dustThreshold = wallet.dustThreshold;
    throw error;
  }

  var balance = Big(wallet.getBalance());
  var needed = Big(value);

  if (balance.lt(needed)) {
    error = new Error('Insufficient funds');
    error.details = 'Attempt to empty wallet';
    error.sendableBalance = balance;
    throw error;
  }
}

module.exports = {
  preCreateTx: preCreateTx
};
