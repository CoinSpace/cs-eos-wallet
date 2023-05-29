import { utf8ToBytes } from './helpers.js';

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
