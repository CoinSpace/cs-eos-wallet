import { utf8ToBytes } from '@noble/hashes/utils';

export function validateAccountName(name = '') {
  if (/^([a-z1-5]){12}$/.test(name)) {
    return true;
  } else {
    return false;
  }
}

export function validateMemo(memo) {
  return utf8ToBytes(memo).length <= 256;
}
