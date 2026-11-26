// Run only after the frontend build. Never print the generated PHP or secrets.
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const configuration = {};
for (const [setting, environment] of Object.entries({
  db_host: 'BLOBULAR_DB_HOST', db_name: 'BLOBULAR_DB_NAME',
  db_user: 'BLOBULAR_DB_USER', db_pass: 'BLOBULAR_DB_PASS',
})) {
  const value = process.env[environment] ?? '';
  if (!value) throw new Error(`Missing ${environment} secret`);
  configuration[setting] = value;
}
if (process.env.BLOBULAR_USERS_TABLE?.trim()) {
  const table = process.env.BLOBULAR_USERS_TABLE.trim();
  if (!/^[a-zA-Z0-9_]{1,55}$/.test(table)) throw new Error('Invalid BLOBULAR_USERS_TABLE');
  configuration.users_table = table;
}
const allowlist = (process.env.BLOBULAR_CLOUD_TEST_ACCOUNT_IDS ?? '').trim();
if (allowlist && !allowlist.split(',').every(entry => {
  const id = entry.trim();
  return /^[1-9][0-9]{0,9}$/.test(id) && Number(id) <= 4294967295;
})) throw new Error('Invalid BLOBULAR_CLOUD_TEST_ACCOUNT_IDS');
configuration.cloud_test_account_ids = allowlist;
configuration.s3_access_key_id = process.env.BLOBULAR_S3_ACCESS_KEY_ID ?? '';
configuration.s3_secret_access_key = process.env.BLOBULAR_S3_SECRET_ACCESS_KEY ?? '';
configuration.s3_session_token = process.env.BLOBULAR_S3_SESSION_TOKEN ?? '';
if (allowlist && (!configuration.s3_access_key_id || !configuration.s3_secret_access_key)) {
  throw new Error('Allowlisted cloud testing requires both BLOBULAR_S3_ACCESS_KEY_ID and BLOBULAR_S3_SECRET_ACCESS_KEY');
}
// Base64 safely transports JSON into PHP source; it is encoding, not encryption.
// This file must remain executable PHP, never a static/public build artifact.
const encoded = Buffer.from(JSON.stringify(configuration), 'utf8').toString('base64');
const output = process.argv[2] ?? 'dist/api/config.php';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `<?php\ndeclare(strict_types=1);\nreturn json_decode(base64_decode('${encoded}'), true, 512, JSON_THROW_ON_ERROR);\n`, { mode: 0o600 });

// Also restrict an existing output file when rerunning locally.
chmodSync(output, 0o600);
