'use strict';

const Big = require('big.js');

function preCreateTx(params) {
  const { to, value, memo, wallet } = params;

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

  let error;

  if (value <= wallet.dustThreshold) {
    error = new Error('Invalid value');
    error.dustThreshold = wallet._unitToAtom(wallet.dustThreshold);
    throw error;
  }

  const balance = Big(wallet._balance);
  const needed = Big(value);

  if (balance.lt(needed)) {
    error = new Error('Insufficient funds');
    error.details = 'Attempt to empty wallet';
    error.sendableBalance = wallet._unitToAtom(balance);
    throw error;
  }
}

module.exports = {
  preCreateTx,
};
