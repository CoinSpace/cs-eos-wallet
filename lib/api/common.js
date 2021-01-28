'use strict';

const { getRequest } = require('./utils');

class Common {
  constructor(url) {
    this.url = url;
  }
  accountSetupPrice() {
    return getRequest(this.url + 'accountSetupPrice').then((data) => {
      return data.price;
    });
  }
}

module.exports = Common;
