#!/usr/bin/env python3
"""Dependency-free HTTP regression tests; only disposable SQLite data is used.

Production endpoint files run unchanged except for a test-copy PDO adapter and
removing MySQL's FOR UPDATE clause (SQLite has no row locks). This does not
validate MySQL DDL, deployment routing, TLS, or MySQL concurrency behavior.
"""
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]


class AuthConfigTests(unittest.TestCase):
    def load_config(self, environment_ttl=None, file_ttl=None):
        with tempfile.TemporaryDirectory(prefix='blobular-config-tests-') as directory:
            api = Path(directory)
            for name in ('_bootstrap.php', '_sessions.php'):
                shutil.copyfile(ROOT / 'public/api' / name, api / name)
            ttl_setting = '' if file_ttl is None else f"'session_ttl_seconds'=>{file_ttl},"
            (api / 'config.php').write_text(
                "<?php return ['db_host'=>'fixture', 'db_name'=>'fixture', "
                "'db_user'=>'fixture', 'db_pass'=>'fixture', " + ttl_setting + "];")
            environment = dict(os.environ)
            environment.pop('BLOBULAR_SESSION_TTL_SECONDS', None)
            if environment_ttl is not None:
                environment['BLOBULAR_SESSION_TTL_SECONDS'] = environment_ttl
            # Calls the real config loader without ever opening a DB connection.
            code = """require $argv[1];
            register_shutdown_function(static function () {
                fwrite(STDERR, (string) (http_response_code() ?: 200));
            });
            $config = loadApiConfig();
            echo json_encode(['ttl' => $config['session_ttl_seconds']]);
            """
            result = subprocess.run(['php', '-r', code, str(api / '_bootstrap.php')],
                env=environment, capture_output=True, text=True, check=True)
            return int(result.stderr), json.loads(result.stdout)

    def test_unset_environment_ttl_uses_default(self):
        self.assertEqual(self.load_config(), (200, {'ttl': 3600}))

    def test_zero_environment_ttl_is_rejected(self):
        status, body = self.load_config('0')
        self.assertEqual(status, 500)
        self.assertFalse(body['ok'])

    def test_invalid_environment_ttl_is_rejected(self):
        for value in ('', 'invalid', '-1', '59', '172801', '1.5'):
            with self.subTest(value=value):
                status, body = self.load_config(value)
                self.assertEqual(status, 500)
                self.assertFalse(body['ok'])

    def test_valid_environment_ttl_is_used(self):
        for value in ('60', '900', '3600', '172800'):
            with self.subTest(value=value):
                self.assertEqual(self.load_config(value), (200, {'ttl': int(value)}))

    def test_file_configuration_still_takes_precedence(self):
        self.assertEqual(self.load_config('0', file_ttl=900), (200, {'ttl': 900}))


class AuthHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.work = tempfile.TemporaryDirectory(prefix='blobular-auth-tests-')
        cls.directory = Path(cls.work.name)
        cls.api = cls.directory / 'api'
        # Never copy real config.php or any credentials into the test fixture.
        for source in (ROOT / 'public/api').rglob('*.php'):
            if source.name in ('config.php', 'config.example.php'):
                continue
            target = cls.api / source.relative_to(ROOT / 'public/api')
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        cls.database = cls.directory / 'test.sqlite'
        bootstrap = cls.api / '_bootstrap.php'
        text = bootstrap.read_text()
        start = text.index('function createPdo(')
        end = text.index('function normalizedEmailFromPayload(')
        text = text[:start] + '''function createPdo(array $config): PDO
{
    return new PDO('sqlite:' . getenv('BLOBULAR_TEST_DATABASE'), null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}
function ensureUsersTable(PDO $pdo, string $table): void {}

''' + text[end:]
        bootstrap.write_text(text)
        reset = cls.api / 'reset-password.php'
        reset.write_text(reset.read_text().replace(' FOR UPDATE', ''))
        cls.password_hash = subprocess.check_output(
            ['php', '-r', 'echo password_hash("TestPassword1!", PASSWORD_BCRYPT);'], text=True)
        with sqlite3.connect(cls.database) as db:
            db.executescript('''
                CREATE TABLE fixture_users (id INTEGER PRIMARY KEY, username TEXT UNIQUE,
                    password_hash TEXT, created_at TEXT DEFAULT '2026-01-01 00:00:00');
                CREATE TABLE fixture_users_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER,
                    created_at INTEGER, expires_at INTEGER, revoked_at INTEGER);
            ''')
            db.executemany('INSERT INTO fixture_users(id, username, password_hash) VALUES (?, ?, ?)',
                           [(1, 'one@example.com', cls.password_hash),
                            (2, 'two@example.com', cls.password_hash)])
        # Fixed disposable settings; loadApiConfig never reads real config/secrets.
        (cls.api / 'config.php').write_text("<?php return ['db_host'=>'fixture', 'db_name'=>'fixture', "
            "'db_user'=>'fixture', 'db_pass'=>'fixture', 'users_table'=>'fixture_users', "
            "'session_ttl_seconds'=>3600];")
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        cls.base = f'http://127.0.0.1:{port}/api/'
        cls.log = (cls.directory / 'server.log').open('w+')
        cls.server = subprocess.Popen(['php', '-d', 'display_errors=1', '-d', 'opcache.enable=0', '-S', f'127.0.0.1:{port}', '-t', str(cls.directory)],
            env={**os.environ, 'BLOBULAR_TEST_DATABASE': str(cls.database)},
            stdout=cls.log, stderr=cls.log)
        for _ in range(100):
            if cls.server.poll() is not None:
                cls.log.seek(0)
                raise RuntimeError(cls.log.read())
            try:
                cls.request('me.php')
                break
            except OSError:
                time.sleep(.02)
        else:
            raise RuntimeError('Test server did not start')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)
        cls.log.close()
        cls.work.cleanup()

    def setUp(self):
        with sqlite3.connect(self.database) as db:
            db.execute('DELETE FROM fixture_users_sessions')
            db.execute('DELETE FROM fixture_users WHERE id > 2')
            db.execute('UPDATE fixture_users SET password_hash = ?', (self.password_hash,))

    @classmethod
    def request(cls, path, method='GET', data=None, token=None):
        headers = {'Content-Type': 'application/json'}
        if token is not None:
            headers['Authorization'] = 'Bearer ' + token
        request = Request(cls.base + path, method=method, headers=headers,
                          data=None if data is None else json.dumps(data).encode())
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        return response.status, json.load(response), response.headers

    def login(self, email='one@example.com', password='TestPassword1!'):
        status, body, headers = self.request('login-user.php', 'POST',
            {'email': email, 'password': password, 'userId': 999})
        self.assertEqual(status, 200)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        return body

    def test_login_preserves_response_and_existing_bcrypt_hash(self):
        body = self.login()
        self.assertTrue(body['ok'])
        self.assertEqual(body['userId'], 1)
        self.assertEqual(body['createdAt'], '2026-01-01 00:00:00')
        self.assertEqual(body['tokenType'], 'Bearer')
        self.assertRegex(body['sessionToken'], r'^[a-f0-9]{64}$')
        self.assertAlmostEqual(body['expiresAt'] - time.time(), 3600, delta=3)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute('SELECT password_hash FROM fixture_users WHERE id=1').fetchone()[0], self.password_hash)
            stored = db.execute('SELECT token_hash FROM fixture_users_sessions').fetchone()[0]
        import hashlib
        self.assertEqual(stored, hashlib.sha256(body['sessionToken'].encode()).hexdigest())
        self.assertNotEqual(stored, body['sessionToken'])

    def test_failed_login_never_creates_session(self):
        for email, password in [('one@example.com', 'wrong'), ('absent@example.com', 'TestPassword1!')]:
            self.assertEqual(self.request('login-user.php', 'POST', {'email': email, 'password': password})[0], 401)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users_sessions').fetchone()[0], 0)

    def test_me_uses_session_owner_and_ignores_client_identity(self):
        token = self.login()['sessionToken']
        for path in ['me.php?userId=2', 'me/']:
            status, body, _ = self.request(path, token=token)
            self.assertEqual(status, 200)
            self.assertEqual(body['user']['id'], 1)
            self.assertEqual(body['user']['email'], 'one@example.com')
            self.assertNotIn('password_hash', body['user'])

    def test_missing_forged_malformed_and_query_tokens_rejected(self):
        token = self.login()['sessionToken']
        for candidate in [None, '', 'invalid', '0' * 64, token[:-1] + ('0' if token[-1] != '0' else '1')]:
            self.assertEqual(self.request('me.php?userId=1', token=candidate)[0], 401)
        self.assertEqual(self.request('me.php?sessionToken=' + token)[0], 401)

    def test_expired_session_is_rejected(self):
        token = self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute('UPDATE fixture_users_sessions SET expires_at = ?', (int(time.time()) - 1,))
        self.assertEqual(self.request('me.php', token=token)[0], 401)
        self.assertEqual(self.request('logout.php', 'POST', token=token)[0], 401)

    def test_logout_revokes_only_presented_token(self):
        first = self.login()['sessionToken']
        second = self.login()['sessionToken']
        other = self.login('two@example.com')['sessionToken']
        self.assertNotEqual(first, second)
        self.assertEqual(self.request('logout/', 'POST', {'userId': 2}, first)[0], 200)
        self.assertEqual(self.request('me.php', token=first)[0], 401)
        self.assertEqual(self.request('logout.php', 'POST', token=first)[0], 401)
        self.assertEqual(self.request('me.php', token=second)[0], 200)
        self.assertEqual(self.request('me.php', token=other)[0], 200)

    def test_methods_cannot_logout_or_login(self):
        token = self.login()['sessionToken']
        self.assertEqual(self.request('logout.php', token=token)[0], 405)
        self.assertEqual(self.request('login-user.php')[0], 405)
        self.assertEqual(self.request('me.php', 'POST', {}, token)[0], 405)
        self.assertEqual(self.request('me.php', token=token)[0], 200)

    def test_password_change_revokes_all_account_sessions(self):
        tokens = [self.login()['sessionToken'], self.login()['sessionToken']]
        other = self.login('two@example.com')['sessionToken']
        status, _, _ = self.request('reset-password.php', 'POST', {
            'email': 'one@example.com', 'currentPassword': 'TestPassword1!', 'newPassword': 'ChangedPassword2!'
        })
        self.assertEqual(status, 200)
        for token in tokens:
            self.assertEqual(self.request('me.php', token=token)[0], 401)
        self.assertEqual(self.request('me.php', token=other)[0], 200)
        self.assertEqual(self.request('login-user.php', 'POST', {'email':'one@example.com', 'password':'TestPassword1!'})[0], 401)
        self.login(password='ChangedPassword2!')

    def test_failed_password_change_preserves_session(self):
        token = self.login()['sessionToken']
        self.assertEqual(self.request('reset-password.php', 'POST', {
            'email':'one@example.com', 'currentPassword':'wrong', 'newPassword':'ChangedPassword2!'
        })[0], 401)
        self.assertEqual(self.request('me.php', token=token)[0], 200)

    def test_deleted_user_cannot_authenticate(self):
        token = self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute('UPDATE fixture_users_sessions SET user_id=999')
        self.assertEqual(self.request('me.php', token=token)[0], 401)

    def test_session_store_failure_fails_closed_without_details(self):
        token = self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute('ALTER TABLE fixture_users_sessions RENAME TO hidden_sessions')
        try:
            for path, method, data in [('me.php', 'GET', None), ('login-user.php', 'POST', {'email':'one@example.com', 'password':'TestPassword1!'}), ('reset-password.php', 'POST', {'email':'one@example.com', 'currentPassword':'TestPassword1!', 'newPassword':'ChangedPassword2!'})]:
                status, body, _ = self.request(path, method, data, token)
                self.assertEqual(status, 500)
                self.assertNotIn('sqlite', json.dumps(body).lower())
                self.assertNotIn('sessionToken', body)
            with sqlite3.connect(self.database) as db:
                self.assertEqual(db.execute('SELECT password_hash FROM fixture_users WHERE id=1').fetchone()[0], self.password_hash)
        finally:
            with sqlite3.connect(self.database) as db:
                db.execute('ALTER TABLE hidden_sessions RENAME TO fixture_users_sessions')

    def test_registration_remains_compatible(self):
        status, body, _ = self.request('create-user.php', 'POST', {
            'email':'new@example.com', 'password':'NewPassword3!'
        })
        self.assertEqual(status, 201)
        self.assertTrue(body['ok'])
        self.assertGreater(body['userId'], 2)
        self.login('new@example.com', 'NewPassword3!')

    def test_malformed_auth_fields_do_not_disclose_php_errors(self):
        for path, data in [
            ('login-user.php', {'email': ['one@example.com'], 'password': 'TestPassword1!'}),
            ('login-user.php', {'email': 'one@example.com', 'password': ['TestPassword1!']}),
            ('create-user.php', {'email': 'new@example.com', 'password': ['TestPassword1!']}),
            ('reset-password.php', {'email': 'one@example.com', 'currentPassword': [], 'newPassword': 'ChangedPassword2!'}),
        ]:
            with self.subTest(path=path, data=data):
                status, body, _ = self.request(path, 'POST', data)
                self.assertEqual(status, 400)
                self.assertFalse(body['ok'])
                self.assertNotIn(str(self.directory), json.dumps(body))

    def test_user_table_provisioning_failure_does_not_disclose_php_errors(self):
        bootstrap = self.api / '_bootstrap.php'
        original = bootstrap.read_text()
        bootstrap.write_text(original.replace(
            'function ensureUsersTable(PDO $pdo, string $table): void {}',
            'function ensureUsersTable(PDO $pdo, string $table): void { throw new PDOException("sensitive-schema-details"); }'))
        try:
            for path, data in [
                ('login-user.php', {'email':'one@example.com', 'password':'TestPassword1!'}),
                ('create-user.php', {'email':'new@example.com', 'password':'TestPassword1!'}),
                ('reset-password.php', {'email':'one@example.com', 'currentPassword':'TestPassword1!', 'newPassword':'ChangedPassword2!'}),
            ]:
                with self.subTest(path=path):
                    status, body, _ = self.request(path, 'POST', data)
                    self.assertEqual(status, 500)
                    self.assertNotIn('sensitive-schema-details', json.dumps(body))
        finally:
            bootstrap.write_text(original)

    def test_registration_hash_failure_returns_generic_json(self):
        # Bcrypt raises ValueError for NUL bytes even with valid strength checks.
        status, body, _ = self.request('create-user.php', 'POST', {
            'email':'new@example.com', 'password':'NewPassword3!' + chr(0)
        })
        self.assertEqual(status, 500)
        self.assertFalse(body['ok'])
        self.assertNotIn('ValueError', json.dumps(body))
        self.assertNotIn(str(self.directory), json.dumps(body))

    def test_exact_expiration_boundary(self):
        # Calls the production session functions with a deterministic clock.
        code = '''require $argv[1];
        $pdo = new PDO('sqlite:' . $argv[2], null, null, [PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $config = ['users_table'=>'fixture_users', 'session_ttl_seconds'=>60];
        $session = issueAuthSession($pdo, $config, 1, 1000);
        if (findAuthSession($pdo, $config, $session['sessionToken'], 1059) === null) { exit(1); }
        if (findAuthSession($pdo, $config, $session['sessionToken'], 1060) !== null) { exit(2); }
        if (findAuthSession($pdo, $config, $session['sessionToken'], 1061) !== null) { exit(3); }
        '''
        subprocess.run(['php', '-r', code, str(self.api/'_sessions.php'), str(self.database)], check=True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
