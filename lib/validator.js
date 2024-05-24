import { utf8ToBytes } from '@noble/hashes/utils';

export function validateAccountName(name = '') {
  if (/^([a-z1-5]){12}$/.test(name)) {
    return true;
  } else {
    return false;
  }
}

export function validateDestinationAccountName(name = '') {
  return /(^[a-z1-5.]{1,11}[a-z1-5]$)|(^[a-z1-5.]{12}[a-j1-5]$)/.test(name);
}

export function validateMemo(memo) {
  return utf8ToBytes(memo).length <= 256;
}
