export default class Common {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }
  async accountSetupPrice() {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: 'api/v1/accountSetupPrice',
    });
    return data.price;
  }
}
