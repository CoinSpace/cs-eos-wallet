import { validateAccountName } from '../validator.js';

export default class Accounts {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }
  async validate(accountName, publicKey) {
    if (!validateAccountName(accountName)) {
      return false;
    }
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: `api/v1/account/${accountName}/validate/${publicKey}`,
    });
    return data.isValid;
  }
  async info(accountName) {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: `api/v1/account/${accountName}`,
    });
    return {
      balance: data.balance,
      isActive: data.isActive,
    };
  }
  async txs(accountName, cursor = 0) {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: `api/v1/account/${accountName}/txs`,
      params: {
        cursor,
      },
    });
    const hasMore = data.txs.length === data.limit;
    if (hasMore) cursor += data.txs.length;
    return {
      transactions: data.txs.filter((tx) => {
        return tx.isEosTransfer;
      }),
      hasMore,
      cursor,
    };
  }
  async accountNameByKey(publicKey) {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: `api/v1/account/key/${publicKey}`,
    });
    return data.accountName;
  }
}
