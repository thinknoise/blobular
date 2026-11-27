import { createServer } from 'node:http';
import { timingSafeEqual, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { AppStoreServerAPIClient, SignedDataVerifier, Environment, VerificationException, VerificationStatus } from '@apple/app-store-server-library';
import { InvalidPurchase, subscriptionVerifier } from './verification.mjs';

export function loadSettings(env = process.env) {
  const needed = key => { if (!env[key]?.trim()) throw new Error(`Missing ${key}`); return env[key].trim(); };
  const environment = needed('APPLE_ENVIRONMENT');
  if (![Environment.PRODUCTION, Environment.SANDBOX].includes(environment)) throw new Error('Invalid Apple environment');
  const secret = needed('VERIFIER_SECRET');
  if (secret.length < 32 || /[\r\n]/.test(secret)) throw new Error('Invalid verifier secret');
  const appAppleId = env.APPLE_APP_ID ? Number(env.APPLE_APP_ID) : undefined;
  if ((environment === Environment.PRODUCTION && appAppleId === undefined)
    || (appAppleId !== undefined && (!Number.isSafeInteger(appAppleId) || appAppleId < 1))) throw new Error('Invalid Apple app ID');
  const port = Number(env.PORT ?? '3091');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
  const productIds = needed('APPLE_PRODUCT_IDS').split(',').map(value => value.trim()).filter(Boolean);
  if (productIds.length === 0) throw new Error('Missing product IDs');
  const roots = needed('APPLE_ROOT_CA_FILES').split(',').map(path => {
    const cert = new X509Certificate(readFileSync(path.trim()));
    if (!cert.ca) throw new Error('Expected Apple root CA certificates');
    return cert.raw;
  });
  return { environment, secret, appAppleId, port, productIds, roots, bundleId: needed('APPLE_BUNDLE_ID'),
    keyId: needed('APPLE_KEY_ID'), issuerId: needed('APPLE_ISSUER_ID'), signingKey: readFileSync(needed('APPLE_PRIVATE_KEY_FILE'), 'utf8') };
}

export function createVerifierServer(service, secret) {
  const authorization = Buffer.from(`Bearer ${secret}`);
  return createServer(async (req, res) => {
    const reply = (code, body) => { res.writeHead(code, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
    const supplied = Buffer.from(req.headers.authorization ?? '');
    if (supplied.length !== authorization.length || !timingSafeEqual(supplied, authorization)) return reply(401, {error:'Unauthorized'});
    if (req.method !== 'POST' || !['/transaction','/notification'].includes(req.url)) return reply(404, {error:'Not found'});
    try {
      let bytes = 0; const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 131072) return reply(413, {error:'Request too large'});
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400,{error:'Invalid request'}); }
      const keys = input && typeof input === 'object' && !Array.isArray(input) ? Object.keys(input).sort() : [];
      const expected = req.url === '/transaction' ? ['appAccountToken','transactionId'] : ['signedPayload'];
      if (JSON.stringify(keys) !== JSON.stringify(expected)) return reply(400,{error:'Invalid request'});
      const snapshots = req.url === '/transaction'
        ? await service.transaction(input.transactionId, input.appAccountToken)
        : await service.notification(input.signedPayload);
      reply(200,{verified:true,snapshots});
    } catch (error) {
      // Online revocation-check outages are retriable; no request data or SDK errors are logged.
      const invalidSignature = error instanceof VerificationException && error.status !== VerificationStatus.RETRYABLE_VERIFICATION_FAILURE;
      reply(error instanceof InvalidPurchase || invalidSignature ? 400 : 503, {error:'Purchase verification failed'});
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = loadSettings();
    const client = new AppStoreServerAPIClient(config.signingKey, config.keyId, config.issuerId, config.bundleId, config.environment);
    const verifier = new SignedDataVerifier(config.roots, true, config.environment, config.bundleId, config.appAppleId);
    const server = createVerifierServer(subscriptionVerifier(client, verifier, config), config.secret);
    server.requestTimeout = 35_000; server.headersTimeout = 10_000;
    server.listen(config.port, '127.0.0.1');
  } catch { process.stderr.write('Apple verifier configuration failed.\n'); process.exitCode = 1; }
}
