import * as errors from '@coinspace/cs-common/errors';
export * from '@coinspace/cs-common/errors';

export class InvalidMemoError extends errors.InvalidMetaError {
  name = 'InvalidMemoError';
  constructor(memo, options) {
    super(`Invalid Memo: "${memo}"`, {
      ...options,
      meta: 'memo',
    });
  }
}

export class InvalidAccountNameError extends TypeError {
  name = 'InvalidAccountNameError';
  constructor(accountName, options) {
    super(`Invalid account name "${accountName}"`, options);
  }
}

export class AccountNameUnavailableError extends TypeError {
  name = 'AccountNameUnavailableError';
  constructor(accountName, options) {
    super(`Account name "${accountName}" is already taken`, options);
  }
}

export class DestinationAccountError extends Error {
  name = 'DestinationAccountError';
}

export class ExpiredTransactionError extends Error {
  name = 'ExpiredTransactionError';
}

export class CPUExceededError extends Error {
  name = 'CPUUsageExceededError';
}

export class NETExceededError extends Error {
  name = 'NETExceededError';
}
