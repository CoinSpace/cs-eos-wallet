export default class Transactions {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }
  async serialize(tx) {
    const data = await this.#wallet.requestNode({
      method: 'POST',
      url: 'api/v1/tx/serialize',
      data: {
        tx,
      },
    });
    return data.serializedTransaction;
  }
  async propagate(pushTransactionArgs) {
    const data = await this.#wallet.requestNode({
      method: 'POST',
      url: 'api/v1/tx/send',
      data: {
        serializedTransaction: pushTransactionArgs.serializedTransaction,
        signatures: pushTransactionArgs.signatures,
      },
    });
    return data.txId;
  }
}
