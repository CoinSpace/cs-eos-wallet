'use strict';

var getRequest = require('./utils').getRequest;

function Common(url) {
  this.url = url;
}

Common.prototype.accountSetupPrice = function() {
  var self = this;
  return getRequest(self.url + 'accountSetupPrice').then(function(data) {
    return data.price;
  });
};

module.exports = Common;
