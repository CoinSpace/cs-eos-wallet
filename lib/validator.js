export function validateAccountName(name = '') {
  if (/^([a-z1-5]){12}$/.test(name)) {
    return true;
  } else {
    return false;
  }
}

export function validateMemo(memo) {
  return Buffer.byteLength(memo, 'utf8') <= 256;
}
