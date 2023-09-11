import { Amount } from '@coinspace/cs-common';
import Wallet from '@coinspace/cs-eos-wallet';
import assert from 'assert/strict';
import sinon from 'sinon';

import { hexToBytes } from '@noble/hashes/utils';

// eslint-disable-next-line max-len
const RANDOM_SEED = hexToBytes('2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874');
const PUBLIC_KEY = 'EOS7tJKsK8frEPribVBiQXByLkADnDUr3DUUr4LBzuThFPYk8EPSj';
const PRIVATE_KEY = '5J31TthDctkYwYVrDTcg8JmjmbK58UFzyPHBy9bzd5XFz2JKswJ';
const ACCOUNT_NAME = 'zxczxczxczxc';
const SECOND_ACCOUNT_NAME = 'ssssssssssss';
const eosAtEos = {
  _id: 'eos@eos',
  asset: 'eos',
  platform: 'eos',
  type: 'coin',
  decimals: 4,
};
const defaultOptions = {
  crypto: eosAtEos,
  platform: eosAtEos,
  cache: { get() {}, set() {} },
  settings: { get() {}, set() {} },
  account: {
    request(...args) { console.log(args); },
  },
  apiNode: 'node',
  storage: { get() {}, set() {}, save() {} },
};

describe('EOS Wallet', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('create wallet instance', () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      assert.equal(wallet.state, Wallet.STATE_CREATED);
    });
  });

  describe('create wallet', () => {
    it('should create new wallet with seed', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, '');
    });

    it('should fails without seed', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await assert.rejects(async () => {
        await wallet.create();
      }, {
        name: 'TypeError',
        message: 'seed must be an instance of Uint8Array or Buffer, undefined provided',
      });
    });
  });

  describe('open wallet', () => {
    it('should open wallet with public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, '');
    });

    it('should fails without public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await assert.rejects(async () => {
        await wallet.open();
      }, {
        name: 'TypeError',
        message: 'publicKey must be an instance of Object with data property',
      });
    });
  });

  describe('storage', () => {
    it('should load initial balance from storage', async () => {
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('balance').returns('1234567890');
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      assert.equal(wallet.balance.value, 1234567890n);
    });
  });

  describe('load', () => {
    it('should load wallet (need activation)', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/key/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({});
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(undefined);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_NEED_ACTIVATION);
    });

    it('should load wallet (account name in storage)', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({
          isValid: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}`,
          baseURL: 'node',
        }).resolves({
          balance: 12.345,
          isActive: true,
        });
      const storage = sinon.mock(defaultOptions.storage);
      storage.expects('set').once().withArgs('balance', '123450');
      storage.expects('save').once();
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(ACCOUNT_NAME);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 123450n);
      storage.verify();
    });

    it('should load wallet (account name from API)', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/key/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({
          accountName: ACCOUNT_NAME,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({
          isValid: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}`,
          baseURL: 'node',
        }).resolves({
          balance: 12.345,
          isActive: true,
        });
      const storage = sinon.mock(defaultOptions.storage);
      storage.expects('set').once().withArgs('accountName', ACCOUNT_NAME);
      storage.expects('set').once().withArgs('balance', '123450');
      storage.expects('save').once();
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(undefined);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 123450n);
      storage.verify();
    });

    it('should set STATE_ERROR on error', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      sinon.stub(defaultOptions.account, 'request');
      await assert.rejects(async () => {
        await wallet.load();
      });
      assert.equal(wallet.state, Wallet.STATE_ERROR);
    });
  });

  describe('setupAccount', () => {
    it('should report how to setup account', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/key/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({})
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({
          isValid: false,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}`,
          baseURL: 'node',
        }).resolves({
          isActive: false,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/accountSetupPrice',
          baseURL: 'node',
        }).resolves({
          price: 123,
        });
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(undefined);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();
      const info = await wallet.setupAccount(ACCOUNT_NAME);
      assert.deepEqual(info, {
        needToCreateAccount: true,
        price: 123,
        memo: 'zxczxczxczxc-EOS7tJKsK8frEPribVBiQXByLkADnDUr3DUUr4LBzuThFPYk8EPSj',
      });
    });
  });

  describe('getPublicKey', () => {
    it('should export public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      const publicKey = wallet.getPublicKey();
      assert.deepEqual(publicKey, { data: PUBLIC_KEY });
    });
  });

  describe('getPrivateKey', () => {
    it('should export private key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      const privateKey = wallet.getPrivateKey(RANDOM_SEED);
      assert.deepEqual(privateKey, [{
        ownerPrivateKey: PRIVATE_KEY,
        ownerPublicKey: PUBLIC_KEY,
        activePrivateKey: PRIVATE_KEY,
        activePublicKey: PUBLIC_KEY,
      }]);
    });
  });

  describe('estimateMaxAmount', () => {
    it('should correct estimate max amount', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}`,
          baseURL: 'node',
        }).resolves({
          balance: 12.345,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({
          isValid: true,
        });
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(ACCOUNT_NAME);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();
      const maxAmount = await wallet.estimateMaxAmount({ address: SECOND_ACCOUNT_NAME });
      assert.equal(maxAmount.value, 123450n);
    });

    it('should estimate max amount to be 0', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}`,
          baseURL: 'node',
        }).resolves({
          balance: 0,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({
          isValid: true,
        });
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(ACCOUNT_NAME);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();
      const maxAmount = await wallet.estimateMaxAmount({ address: SECOND_ACCOUNT_NAME });
      assert.equal(maxAmount.value, 0n);
    });
  });

  describe('estimateTransactionFee', () => {
    it('should estimate transaction fee', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}`,
          baseURL: 'node',
        }).resolves({
          balance: 10,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({
          isValid: true,
        });
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(ACCOUNT_NAME);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();
      const fee = await wallet.estimateTransactionFee({
        address: SECOND_ACCOUNT_NAME,
        amount: new Amount(1n, wallet.crypto.decimals),
      });
      assert.equal(fee.value, 0n);
    });
  });

  describe('validators', () => {
    describe('validateAddress', () => {
      let wallet;
      beforeEach(async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            isActive: true,
          })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
            baseURL: 'node',
          }).resolves({
            isValid: true,
          });
        sinon.stub(defaultOptions.storage, 'get')
          .withArgs('accountName')
          .returns(ACCOUNT_NAME);
        wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: PUBLIC_KEY });
        await wallet.load();
      });

      it('valid address', async () => {
        assert.ok(await wallet.validateAddress({ address: SECOND_ACCOUNT_NAME }));
      });

      it('invalid address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: '123' });
        }, {
          name: 'InvalidAddressError',
          message: 'Invalid address "123"',
        });
      });

      it('own address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: ACCOUNT_NAME });
        }, {
          name: 'DestinationEqualsSourceError',
          message: 'Destination address equals source address',
        });
      });
    });

    describe('validateAmount', () => {
      it('should be valid amount', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            isActive: true,
          })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
            baseURL: 'node',
          }).resolves({
            isValid: true,
          });
        sinon.stub(defaultOptions.storage, 'get')
          .withArgs('accountName')
          .returns(ACCOUNT_NAME);
        const wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: PUBLIC_KEY });
        await wallet.load();

        const valid = await wallet.validateAmount({
          address: SECOND_ACCOUNT_NAME,
          amount: new Amount(1_0000n, wallet.crypto.decimals),
        });
        assert.ok(valid);
      });

      it('throw on inactive account', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}`,
            baseURL: 'node',
          }).resolves({
            balance: 0,
            isActive: false,
          })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
            baseURL: 'node',
          }).resolves({
            isValid: true,
          });
        sinon.stub(defaultOptions.storage, 'get')
          .withArgs('accountName')
          .returns(ACCOUNT_NAME);
        const wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: PUBLIC_KEY });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ACCOUNT_NAME,
            amount: new Amount(123n, wallet.crypto.decimals),
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(0n, wallet.crypto.decimals),
        });
      });

      it('throw on small amount', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            isActive: true,
          })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
            baseURL: 'node',
          }).resolves({
            isValid: true,
          });
        sinon.stub(defaultOptions.storage, 'get')
          .withArgs('accountName')
          .returns(ACCOUNT_NAME);
        const wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: PUBLIC_KEY });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ACCOUNT_NAME,
            amount: new Amount(0n, wallet.crypto.decimals),
          });
        }, {
          name: 'SmallAmountError',
          message: 'Small amount',
          amount: new Amount(1n, wallet.crypto.decimals),
        });
      });

      it('throw on big amount', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            isActive: true,
          })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
            baseURL: 'node',
          }).resolves({
            isValid: true,
          });
        sinon.stub(defaultOptions.storage, 'get')
          .withArgs('accountName')
          .returns(ACCOUNT_NAME);
        const wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: PUBLIC_KEY });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ACCOUNT_NAME,
            amount: new Amount(200_0000n, wallet.crypto.decimals),
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(123450n, wallet.crypto.decimals),
        });
      });
    });

    describe('validateMeta', () => {
      let wallet;
      beforeEach(async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            isActive: true,
          })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
            baseURL: 'node',
          }).resolves({
            isValid: true,
          });
        sinon.stub(defaultOptions.storage, 'get')
          .withArgs('accountName')
          .returns(ACCOUNT_NAME);
        wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: PUBLIC_KEY });
        await wallet.load();
      });

      it('should support meta', () => {
        assert.ok(wallet.isMetaSupported);
      });

      it('empty meta is valid', async () => {
        assert.ok(await wallet.validateMeta({
          address: SECOND_ACCOUNT_NAME,
        }));
      });

      it('valid memo', async () => {
        assert.ok(await wallet.validateMeta({
          address: SECOND_ACCOUNT_NAME,
          meta: {
            memo: '12345',
          },
        }));
      });

      it('should throw invalid memo', async () => {
        await assert.rejects(async () => {
          await wallet.validateMeta({
            address: SECOND_ACCOUNT_NAME,
            meta: {
              memo: 'x'.repeat(256 + 1),
            },
          });
        }, {
          name: 'InvalidMemoError',
          message: `Invalid Memo: "${'x'.repeat(256 + 1)}"`,
          meta: 'memo',
        });
      });
    });
  });

  describe('createTransaction', () => {
    it('should create valid transaction', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}`,
          baseURL: 'node',
        }).resolves({
          balance: 12.345,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${ACCOUNT_NAME}/validate/${PUBLIC_KEY}`,
          baseURL: 'node',
        }).resolves({
          isValid: true,
        })
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/tx/serialize',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({
          serializedTransaction: 'aa',
        })
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/tx/send',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({
          txId: '123456',
        });
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('accountName')
        .returns(ACCOUNT_NAME);
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: PUBLIC_KEY });
      await wallet.load();

      const id = await wallet.createTransaction({
        address: SECOND_ACCOUNT_NAME,
        amount: new Amount(1_0000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 113450n);
      assert.equal(id, '123456');
    });
  });
});
