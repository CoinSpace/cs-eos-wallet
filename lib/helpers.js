import { ripemd160 } from '@noble/hashes/ripemd160';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { base58, base58check, utils } from '@scure/base';
import { bytesToNumberBE, numberToBytesBE } from '@noble/curves/abstract/utils';
import { concatBytes, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';

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
  return getKeypairFromSeedString(seed.toString('hex'));
}

/** Construct the digest from transaction details */
function digestFromSerializedData(chainId, serializedTransaction, serializedContextFreeData) {
  const signBytes = concatBytes(
    hexToBytes(chainId),
    hexToBytes(serializedTransaction),
    serializedContextFreeData ?
      sha256(hexToBytes(serializedContextFreeData)) :
      new Uint8Array(32)
  );
  return sha256(signBytes);
}

function isEOSCanonical(sigData) {
  return !(sigData[1] & 0x80) && !(sigData[1] === 0 && !(sigData[2] & 0x80))
  && !(sigData[33] & 0x80) && !(sigData[33] === 0 && !(sigData[34] & 0x80));
}

export function sign({ chainId, serializedTransaction, serializedContextFreeData }, seed) {
  const { privateKeyBytes } = getKeypairFromSeed(seed);
  const privateKey = normalizePrivateKey(privateKeyBytes);
  const digest = digestFromSerializedData(chainId, serializedTransaction, serializedContextFreeData);
  let signature;
  let entropy = 0;
  do {
    const sig = secp256k1.sign(digest, privateKey, {
      //extraEntropy: new Uint8Array([++entropy]),
      extraEntropy: numberToBytesBE(++entropy, 32),
    });
    signature = concatBytes(
      new Uint8Array([sig.recovery + 27 + 4]),
      numberToBytesBE(sig.r, 32),
      numberToBytesBE(sig.s, 32)
    );
  } while (!isEOSCanonical(signature));
  return 'SIG_K1_' + base58ripemd160check('K1').encode(signature);
}
