#!/usr/bin/env python3
"""Host-managed configuration tests; temporary files and dummy credentials only."""
import base64
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]


class CloudConfigTests(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory(prefix='blobular-cloud-config-')
        self.addCleanup(self.work.cleanup)
        self.api = Path(self.work.name)
        for name in ('_s3.php', '_sounds.php', '.htaccess'):
            shutil.copyfile(ROOT/'public/api'/name, self.api/name)
        self.environment = {key:value for key,value in os.environ.items() if not key.startswith('BLOBULAR_')}

    def configure(self, values):
        encoded = base64.b64encode(json.dumps(values).encode()).decode()
        (self.api/'config.php').write_text("<?php return json_decode(base64_decode('"+encoded+"'), true);")

    def php(self, code, extra=None):
        result = subprocess.run(['php', '-r', code, str(self.api/'_sounds.php')],
            env={**self.environment, **(extra or {})}, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def access(self, owner, extra=None):
        return self.php('require $argv[1]; try { requireCloudAudioWriteAccess('+str(owner)+'); echo "true"; } '
            'catch (AudioApiError $error) { echo "false"; }', extra)

    def test_absent_empty_and_malformed_settings_deny_by_default(self):
        self.assertFalse(self.access(6))
        for value in ('', ' ', '0', '06', '6,*', '6,', '-1', '4294967296'):
            with self.subTest(value=value):
                self.configure({'cloud_test_account_ids':value})
                self.assertFalse(self.access(6))

    def test_host_config_allows_only_account_six_and_loads_permanent_keys(self):
        secret = "fixture'\\secret\n$backtick`"
        self.configure({'cloud_test_account_ids':'6', 's3_access_key_id':'fixture-key',
                        's3_secret_access_key':secret, 'db_name':'fixture-db'})
        self.assertTrue(self.access(6))
        for owner in (1, 5, 7):
            self.assertFalse(self.access(owner))
        config = self.php('require $argv[1]; echo json_encode(cloudStorageConfig());')
        self.assertEqual(config, {'bucket':'blobular-audio', 'region':'us-east-2',
                                 'key':'fixture-key', 'secret':secret, 'token':''})
        self.assertEqual(subprocess.check_output(['php', str(self.api/'config.php')]), b'')

    def test_file_values_take_precedence_including_explicit_empty(self):
        self.configure({'cloud_test_account_ids':'6', 's3_access_key_id':'file-key',
                        's3_secret_access_key':'file-secret', 's3_session_token':''})
        environment = {'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':'7', 'BLOBULAR_S3_ACCESS_KEY_ID':'environment-key',
                       'BLOBULAR_S3_SESSION_TOKEN':'stale-token'}
        self.assertTrue(self.access(6, environment))
        self.assertFalse(self.access(7, environment))
        config = self.php('require $argv[1]; echo json_encode(cloudStorageConfig());', environment)
        self.assertEqual(config['key'], 'file-key')
        self.assertEqual(config['token'], '')
        self.configure({'cloud_test_account_ids':''})
        self.assertFalse(self.access(6, {'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':'6'}))

    def test_environment_fallback_and_optional_session_token(self):
        self.assertTrue(self.access(6, {'BLOBULAR_CLOUD_TEST_ACCOUNT_IDS':'6'}))
        config = self.php('require $argv[1]; echo json_encode(cloudStorageConfig());',
            {'BLOBULAR_S3_ACCESS_KEY_ID':'fixture-key', 'BLOBULAR_S3_SECRET_ACCESS_KEY':'fixture-secret',
             'BLOBULAR_S3_SESSION_TOKEN':'fixture-token'})
        self.assertEqual(config['token'], 'fixture-token')

    def test_invalid_config_types_fail_closed_without_details(self):
        for value in (None, 6, ['6']):
            self.configure({'cloud_test_account_ids':value})
            self.assertTrue(self.php('require $argv[1]; try { requireCloudAudioWriteAccess(6); echo "false"; } '
                'catch (ObjectStoreFailure $error) { echo "true"; }'))

    def test_workflow_preserves_host_config_without_credential_secrets(self):
        workflow = (ROOT/'.github/workflows/deploy.yml').read_text()
        self.assertNotIn('secrets.BLOBULAR_', workflow)
        self.assertNotIn('write-php-config', workflow)
        self.assertIn('rm -f dist/api/config.php', workflow)
        self.assertIn('**/config.php*', workflow)
        self.assertIn('**/.config.php*', workflow)
        self.assertIn('dangerous-clean-slate: false', workflow)
        self.assertIn('protocol: ftps', workflow)
        self.assertIn('security: strict', workflow)
        self.assertNotIn('push:', workflow)
        self.assertNotIn('upload-artifact', workflow)

    def test_post_build_removal_keeps_host_config_and_deploys_denial_rules(self):
        self.configure({'cloud_test_account_ids':'6'})
        original = (self.api/'config.php').read_bytes()
        build = self.api/'dist/api'
        build.mkdir(parents=True)
        for name in ('config.php', 'config.php.bak', 'config.php~', '.config.php.swp', 'config.example.php', '.htaccess'):
            (build/name).write_text('fixture')
        workflow = (ROOT/'.github/workflows/deploy.yml').read_text()
        command = next(line.strip()[5:] for line in workflow.splitlines() if 'run: rm -f dist/api/config.php' in line)
        subprocess.run(command, shell=True, cwd=self.api, check=True)
        self.assertEqual(sorted(p.name for p in build.iterdir()), ['.htaccess', 'config.example.php'])
        self.assertEqual((self.api/'config.php').read_bytes(), original)

    def test_real_config_and_backups_are_git_ignored_but_rules_and_example_are_not(self):
        for path in ('public/api/config.php','public/api/config.php.bak','public/api/config.php~',
                     'public/api/.config.php.swp'):
            self.assertEqual(subprocess.run(['git','check-ignore','--quiet',path], cwd=ROOT).returncode, 0)
        for path in ('public/api/.htaccess','public/api/config.example.php'):
            self.assertNotEqual(subprocess.run(['git','check-ignore','--quiet',path], cwd=ROOT).returncode, 0)

    def test_apache_denies_config_and_backup_http_requests(self):
        apache = shutil.which('httpd') or shutil.which('apache2')
        modules = Path('/usr/libexec/apache2') if Path('/usr/libexec/apache2').exists() else Path('/usr/lib/apache2/modules')
        if not apache or not modules.exists():
            self.skipTest('Apache and shared modules unavailable; verify hosting denial rules separately')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        (self.api/'public.txt').write_text('fixture-public')
        for name in ('config.php','config.php.bak','config.php~','.config.php.swp','CONFIG.PHP'):
            (self.api/name).write_text('fixture-secret-must-never-be-served')
        config = self.api/'httpd.conf'
        config.write_text(f'''ServerRoot "{self.api}"
ServerName localhost
Listen 127.0.0.1:{port}
LoadModule mpm_event_module "{modules}/mod_mpm_event.so"
LoadModule authz_core_module "{modules}/mod_authz_core.so"
LoadModule unixd_module "{modules}/mod_unixd.so"
User #{os.getuid()}
Group #{os.getgid()}
PidFile "{self.api}/httpd.pid"
ErrorLog "{self.api}/error.log"
DocumentRoot "{self.api}"
<Directory "{self.api}">
    AllowOverride AuthConfig
    Require all granted
</Directory>
''')
        server = subprocess.Popen([apache, '-f', str(config), '-DFOREGROUND'], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        try:
            for _ in range(50):
                if server.poll() is not None:
                    self.fail(server.stderr.read().decode())
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{port}/public.txt', timeout=1) as response:
                        self.assertEqual(response.read(), b'fixture-public')
                    break
                except OSError:
                    time.sleep(.05)
            else:
                self.fail('Disposable Apache did not start')
            for name in ('config.php','config.php.bak','config.php~','.config.php.swp','CONFIG.PHP'):
                with self.assertRaises(urllib.error.HTTPError) as result:
                    urllib.request.urlopen(f'http://127.0.0.1:{port}/{name}', timeout=2)
                self.assertEqual(result.exception.code, 403)
                self.assertNotIn(b'fixture-secret', result.exception.read())
                result.exception.close()
        finally:
            server.terminate()
            server.wait(timeout=5)
            server.stderr.close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
