/* eslint-disable max-len */
import assert from 'node:assert/strict';
import { getKeypairFromSeedString } from '../lib/helpers.js';

describe('helpers', () => {
  describe('getKeypairFromSeedString', () => {
    it('keypair (1)', () => {
      const pair = getKeypairFromSeedString('');
      assert.equal(pair.privateKey, '5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss');
      assert.equal(pair.publicKey, 'EOS859gxfnXyUriMgUeThh1fWv3oqcpLFyHa3TfFYC4PK2HqhToVM');
    });

    it('keypair (2)', () => {
      const seed = '2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874';
      const pair = getKeypairFromSeedString(seed);
      assert.equal(pair.privateKey, '5J31TthDctkYwYVrDTcg8JmjmbK58UFzyPHBy9bzd5XFz2JKswJ');
      assert.equal(pair.publicKey, 'EOS7tJKsK8frEPribVBiQXByLkADnDUr3DUUr4LBzuThFPYk8EPSj');
    });
  });
});
