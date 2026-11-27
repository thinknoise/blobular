import { Type, InAppOwnershipType } from '@apple/app-store-server-library';

export class InvalidPurchase extends Error {}
const requireFact = (condition) => { if (!condition) throw new InvalidPurchase('Purchase verification failed.'); };
const numericId = value => typeof value === 'string' && /^[0-9]{1,64}$/.test(value);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const millis = value => Number.isSafeInteger(value) && value > 0 && value <= Date.now() + 300_000;

// The caller supplies Apple's SDK, never decoded client JSON. All snapshots are
// refreshed from Apple's Server API so replayed notifications cannot restore old access.
export function subscriptionVerifier(client, verifier, config) {
  const products = new Set(config.productIds);
  function transactionFacts(tx) {
    requireFact(tx && numericId(tx.originalTransactionId) && numericId(tx.transactionId)
      && tx.bundleId === config.bundleId && tx.environment === config.environment
      && products.has(tx.productId) && tx.type === Type.AUTO_RENEWABLE_SUBSCRIPTION
      && tx.inAppOwnershipType === InAppOwnershipType.PURCHASED
      && uuid(tx.appAccountToken) && millis(tx.signedDate)
      && Number.isSafeInteger(tx.expiresDate) && tx.expiresDate > 0);
    return tx;
  }
  async function current(initial, accountToken) {
    requireFact(uuid(accountToken) && initial.appAccountToken.toLowerCase() === accountToken.toLowerCase());
    const response = await client.getAllSubscriptionStatuses(initial.transactionId);
    requireFact(response.environment === config.environment && response.bundleId === config.bundleId);
    if (config.appAppleId !== undefined) requireFact(response.appAppleId === config.appAppleId);
    const matches = (response.data ?? []).flatMap(group => group.lastTransactions ?? [])
      .filter(item => item.originalTransactionId === initial.originalTransactionId);
    requireFact(matches.length === 1);
    const item = matches[0];
    const tx = transactionFacts(await verifier.verifyAndDecodeTransaction(item.signedTransactionInfo));
    const renewal = await verifier.verifyAndDecodeRenewalInfo(item.signedRenewalInfo);
    requireFact(tx.originalTransactionId === initial.originalTransactionId
      && tx.appAccountToken.toLowerCase() === accountToken.toLowerCase()
      && renewal.originalTransactionId === tx.originalTransactionId
      && renewal.environment === config.environment && renewal.productId === tx.productId
      && millis(renewal.signedDate) && [0, 1].includes(renewal.autoRenewStatus));
    if (renewal.appAccountToken !== undefined) requireFact(renewal.appAccountToken.toLowerCase() === accountToken.toLowerCase());
    const statuses = { 1: 'active', 2: 'expired', 3: 'billing_retry', 4: 'grace', 5: 'revoked' };
    let status = statuses[item.status];
    requireFact(status !== undefined);
    if (tx.revocationDate !== undefined) {
      requireFact(millis(tx.revocationDate)); status = 'revoked';
    }
    let expires = tx.expiresDate;
    if (status === 'grace') {
      requireFact(Number.isSafeInteger(renewal.gracePeriodExpiresDate) && renewal.gracePeriodExpiresDate > 0);
      expires = renewal.gracePeriodExpiresDate;
    }
    return [{ originalId: tx.originalTransactionId, transactionId: tx.transactionId, productId: tx.productId,
      environment: tx.environment, appAccountToken: tx.appAccountToken.toLowerCase(), status,
      expiresAt: Math.floor(expires / 1000), signedAt: Math.max(tx.signedDate, renewal.signedDate),
      willRenew: renewal.autoRenewStatus === 1, revokedAt: tx.revocationDate === undefined ? null : Math.floor(tx.revocationDate / 1000) }];
  }
  return {
    async transaction(id, accountToken) {
      requireFact(numericId(id) && uuid(accountToken));
      const response = await client.getTransactionInfo(id);
      const tx = transactionFacts(await verifier.verifyAndDecodeTransaction(response.signedTransactionInfo));
      requireFact(tx.transactionId === id);
      return current(tx, accountToken);
    },
    async notification(signedPayload) {
      requireFact(typeof signedPayload === 'string' && signedPayload.length > 16);
      const notification = await verifier.verifyAndDecodeNotification(signedPayload);
      // TEST notifications and non-subscription events have no transaction.
      if (!notification.data?.signedTransactionInfo) return [];
      const tx = transactionFacts(await verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo));
      return current(tx, tx.appAccountToken);
    },
  };
}
