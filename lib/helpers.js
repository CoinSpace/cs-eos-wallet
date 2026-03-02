import { ripemd160 } from '@noble/hashes/ripemd160';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { base58, base58check, utils } from '@scure/base';
import { bytesToHex, concatBytes, utf8ToBytes } from '@noble/hashes/utils';
import { bytesToNumberBE, numberToBytesBE } from '@noble/curves/abstract/utils';

function base58ripemd160check(suffix = '') {
  return utils.chain(
    utils.checksum(4, (data) => ripemd160(concatBytes(data, utf8ToBytes(suffix)))),
    base58
  );
}

function normalizePrivateKey(data) {
  return numberToBytesBE(bytesToNumberBE(data) % secp256k1.CURVE.n, 32);
}

/**
 * private
 * https://github.com/EOSIO/eosjs-ecc/blob/a806b93fbbccec8d38c0c02998d204ff2040a6ae/src/key_private.js#L50-L55
 * https://github.com/EOSIO/eosjs-ecc/blob/a806b93fbbccec8d38c0c02998d204ff2040a6ae/src/key_utils.js#L183-L186
 * public
 * https://github.com/EOSIO/eosjs-ecc/blob/a806b93fbbccec8d38c0c02998d204ff2040a6ae/src/key_private.js#L62-L70
 * https://github.com/EOSIO/eosjs-ecc/blob/a806b93fbbccec8d38c0c02998d204ff2040a6ae/src/key_utils.js#L187-L193
 */
export function getKeypairFromSeedString(seed) {
  if (!(typeof seed === 'string')) {
    throw new Error('seed must be of type string');
  }
  const privateKeyBytes = sha256(seed);
  const privateKey = base58check(sha256)
    .encode(concatBytes(new Uint8Array([0x80]), privateKeyBytes));
  const publicKeyBytes = secp256k1.getPublicKey(normalizePrivateKey(privateKeyBytes));
  const publicKey = 'EOS' + base58ripemd160check().encode(publicKeyBytes);
  return {
    privateKeyBytes,
    privateKey,
    publicKeyBytes,
    publicKey,
  };
}

export function getKeypairFromSeed(seed) {
  return getKeypairFromSeedString(bytesToHex(seed));
}
