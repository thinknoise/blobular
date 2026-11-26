#!/usr/bin/env python3
"""Server-only deployment configuration and allowlist tests; dummy credentials only."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class CloudConfigTests(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory(prefix='blobular-cloud-config-')
        self.addCleanup(self.work.cleanup)
        self.api = Path(self.work.name)
        for name in ('_s3.php', '_sounds.php'):
            shutil.copyfile(ROOT/'public/api'/name, self.api/name)
        self.environment = {key:value for key,value in os.environ.items() if not key.startswith('BLOBULAR_')}
        self.environment.update({'BLOBULAR_DB_HOST':'fixture-host', 'BLOBULAR_DB_NAME':'fixture-db',
            'BLOBULAR_DB_USER':'fixture-user', 'BLOBULAR_DB_PASS':'fixture-password',
            'BLOBULAR_USERS_TABLE':'blobular_users'})

    def generate(self, extra=None):
        environment = {**self.environment, **(extra or {})}
        return subprocess.run(['node', str(ROOT/'scripts/write-php-config.mjs'), str(self.api/'config.php')],
            env=environment, capture_output=True, text=True)

    def php(self, code, extra=None):
        result = subprocess.run(['php', '-r', code, str(self.api/'_sounds.php')],
            env={**self.environment, **(extra or {})}, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def access(self, owner, extra=None):
        return self.php('require $argv[1]; try { requireCloudAudioWriteAccess('+str(owner)+'); echo "true"; } '
            'catch (AudioApiError $error) { echo "false"; }', extra)

    def test_absent_and_empty_settings_deny_by_default(self):
        self.assertFalse(self.access(1))
        result = self.generate()
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, '')
        self.assertFalse(self.access(1))
        self.assertEqual(self.php('echo json_encode(require dirname($argv[1])."/config.php");')['db_name'], 'fixture-db')

    def test_environment_allowlist_is_strict_and_uses_account_ids(self):
        self.assertTrue(self.access(2, {'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':' 1, 2 '}))
        self.assertFalse(self.access(3, {'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':'1,2'}))
        for value in ('', '0', '01', '1,*', '1,', '1,2bad', '-1', '4294967296'):
            with self.subTest(value=value):
                self.assertFalse(self.access(1, {'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':value}))

    def test_generated_config_supplies_storage_and_allowlist_without_logging(self):
        secret = "fixture'\\secret\n$backtick`"
        result = self.generate({'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':'1,2',
            'BLOBULAR_S3_ACCESS_KEY_ID':'fixture-key', 'BLOBULAR_S3_SECRET_ACCESS_KEY':secret,
            'BLOBULAR_S3_SESSION_TOKEN':'fixture-session-token'})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, '')
        self.assertEqual(result.stderr, '')
        self.assertTrue(self.access(1)); self.assertFalse(self.access(3))
        config = self.php('require $argv[1]; echo json_encode(cloudStorageConfig());')
        self.assertEqual(config['key'], 'fixture-key')
        self.assertEqual(config['secret'], secret)
        self.assertEqual(config['token'], 'fixture-session-token')
        # Executing the server PHP file directly produces no browser response.
        result = subprocess.run(['php', str(self.api/'config.php')], capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout, '')
        self.assertNotIn(secret, (self.api/'config.php').read_text())

    def test_environment_can_disable_generated_allowlist(self):
        self.assertEqual(self.generate({'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':'1',
            'BLOBULAR_S3_ACCESS_KEY_ID':'fixture-key','BLOBULAR_S3_SECRET_ACCESS_KEY':'fixture-secret'}).returncode, 0)
        self.assertTrue(self.access(1))
        self.assertFalse(self.access(1, {'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':''}))
        config = self.php('require $argv[1]; echo json_encode(cloudStorageConfig());',
                          {'BLOBULAR_S3_ACCESS_KEY_ID':'runtime-key'})
        self.assertEqual(config['key'], 'runtime-key')

    def test_generation_rejects_invalid_allowlist_and_missing_storage(self):
        for extra in ({'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':'1,*'}, {'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':'1'}):
            with self.subTest(extra=extra):
                result = self.generate(extra)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.api/'config.php').exists())
                self.assertNotIn('fixture-password', result.stdout+result.stderr)

    def test_workflow_keeps_secrets_after_build_and_requires_verified_ftps(self):
        workflow = (ROOT/'.github/workflows/deploy.yml').read_text()
        self.assertLess(workflow.index('run: npm run build'), workflow.index('run: node scripts/write-php-config.mjs'))
        for name in ('BLOBULAR_CLOUD_TEST_ACCOUNT_IDS','BLOBULAR_S3_ACCESS_KEY_ID',
                     'BLOBULAR_S3_SECRET_ACCESS_KEY','BLOBULAR_S3_SESSION_TOKEN'):
            self.assertIn('${{ secrets.'+name+' }}', workflow)
        self.assertIn('protocol: ftps', workflow)
        self.assertIn('security: strict', workflow)
        self.assertNotIn('protocol: ftp\n', workflow)
        self.assertNotIn('push:', workflow)
        self.assertNotIn('upload-artifact', workflow)


if __name__ == '__main__':
    unittest.main(verbosity=2)
