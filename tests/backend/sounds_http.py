#!/usr/bin/env python3
"""Exercise real audio HTTP handlers with disposable session/DB/object fixtures."""
import hashlib
import json
import os
import subprocess
from pathlib import Path
import shutil
import sqlite3
import sys
import unittest
sys.dont_write_bytecode = True
import run as auth


class SoundHTTPTests(auth.AuthHTTPTests):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        schema = '''CREATE TABLE fixture_users_sounds (id TEXT PRIMARY KEY,owner_user_id INTEGER,
            storage_bucket TEXT,storage_key TEXT,title TEXT,original_filename TEXT,mime_type TEXT,
            byte_size INTEGER,source_kind TEXT,visibility TEXT,state TEXT,staging_key TEXT,
            checksum_sha256 TEXT,upload_expires_at INTEGER,cleanup_after INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP)'''
        with sqlite3.connect(cls.database) as db:
            db.execute(schema)
        shutil.copyfile(Path(__file__).with_name('fixture_http_store.php'), cls.api / '_fixture.php')
        service = cls.api / '_sounds.php'
        content = service.read_text()
        constructor = 'new S3AudioObjectStore(cloudStorageConfig())'
        assert constructor in content
        content = content.replace(constructor, 'new FixtureHttpStore()')
        content = content.replace("require_once __DIR__ . '/_s3.php';",
            "require_once __DIR__ . '/_s3.php';\nrequire_once __DIR__ . '/_fixture.php';")
        service.write_text(content)

    def setUp(self):
        super().setUp()
        with sqlite3.connect(self.database) as db:
            db.execute('DELETE FROM fixture_users_sounds')
        (self.api / 'objects.json').write_text('{"objects":{}}')
        self.input = {'filename':'one.wav', 'mimeType':'audio/wav', 'byteSize':32,
            'checksumSha256':hashlib.sha256(b'fixture').hexdigest()}

    def begin_upload(self, token):
        status, body, _ = self.request('sounds.php', 'POST', self.input, token)
        self.assertEqual(status, 201)
        self.assertEqual(body['state'], 'uploading')
        return body['id']

    def put_fixture(self, record_id, **overrides):
        obj = {'bytes':32, 'mime':'audio/wav', 'checksum':'', 'etag':'"fixture-etag"'}
        import base64
        obj['checksum'] = base64.b64encode(hashlib.sha256(b'fixture').digest()).decode()
        obj.update(overrides)
        (self.api/'objects.json').write_text(json.dumps({'objects':{
            'cloud-library/staging/1/' + record_id:obj}}))

    def complete_upload(self, token):
        record_id = self.begin_upload(token)
        self.put_fixture(record_id)
        self.assertEqual(self.request('sound.php?id='+record_id, 'POST', {}, token)[0], 200)
        return record_id

    def test_all_operations_require_authentication(self):
        record_id = '00000000-0000-4000-8000-000000000001'
        for token in (None, '0'*64):
            for path, method, data in [('sounds.php','GET',None), ('sounds.php','POST',self.input),
                ('sound.php?id='+record_id,'GET',None), ('sound.php?id='+record_id,'POST',{}),
                ('sound.php?id='+record_id,'DELETE',None)]:
                with self.subTest(method=method, path=path):
                    status, body, headers = self.request(path, method, data, token)
                    self.assertEqual(status, 401)
                    self.assertFalse(body['ok'])
                    self.assertNotIn('sound', body)
                    self.assertNotIn('url', json.dumps(body))
                    self.assertEqual(headers['Cache-Control'], 'no-store')

    def test_flow_uses_authenticated_owner(self):
        one = self.login()['sessionToken']
        two = self.login('two@example.com')['sessionToken']
        self.input.update({'owner_user_id':2, 'userId':2, 'storage_key':'audio-pond/other'})
        record_id = self.begin_upload(one)
        self.assertEqual(self.request('sounds.php', token=one)[1]['sounds'], [])
        self.put_fixture(record_id)
        self.assertEqual(self.request('sound.php?id='+record_id, 'POST', {}, one)[0], 200)
        self.assertEqual(len(self.request('sounds.php?userId=2', token=one)[1]['sounds']), 1)
        self.assertEqual(self.request('sounds.php', token=two)[1]['sounds'], [])
        for method in ('GET','POST','DELETE'):
            status, body, _ = self.request('sound.php?id='+record_id, method, None, two)
            self.assertEqual(status, 404)
            self.assertEqual(body['message'], 'Recording not found.')
        status, body, _ = self.request('sound.php?id='+record_id, token=one)
        self.assertEqual(status, 200)
        self.assertIn('cloud-library/saved/1/', body['download']['url'])
        self.assertEqual(self.request('sound.php?id='+record_id, 'DELETE', token=one)[0], 200)
        self.assertEqual(self.request('sounds.php', token=one)[1]['sounds'], [])

    def test_expired_session_cannot_access_audio(self):
        token = self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute('UPDATE fixture_users_sessions SET expires_at=0')
        self.assertEqual(self.request('sounds.php', token=token)[0], 401)
        self.assertEqual(self.request('sounds.php','POST',self.input,token)[0], 401)

    def test_incomplete_and_mismatched_uploads_stay_hidden(self):
        token = self.login()['sessionToken']
        record_id = self.begin_upload(token)
        self.assertEqual(self.request('sound.php?id='+record_id, 'POST', {}, token)[0], 409)
        self.put_fixture(record_id, bytes=31)
        self.assertEqual(self.request('sound.php?id='+record_id, 'POST', {}, token)[0], 409)
        self.assertEqual(self.request('sounds.php', token=token)[1]['sounds'], [])
        self.assertEqual(self.request('sound.php?id='+record_id, token=token)[0], 409)

    def test_storage_failure_is_generic_and_retryable(self):
        token = self.login()['sessionToken']
        record_id = self.complete_upload(token)
        state = json.loads((self.api/'objects.json').read_text()); state['fail'] = True
        (self.api/'objects.json').write_text(json.dumps(state))
        status, body, _ = self.request('sound.php?id='+record_id, 'DELETE', token=token)
        self.assertEqual(status, 503)
        self.assertNotIn('sensitive', json.dumps(body))
        self.assertEqual(self.request('sounds.php', token=token)[1]['sounds'], [])
        self.assertEqual(self.request('sound.php?id='+record_id, token=token)[0], 409)
        state['fail'] = False; (self.api/'objects.json').write_text(json.dumps(state))
        self.assertEqual(self.request('sound.php?id='+record_id, 'DELETE', token=token)[0], 200)

    def test_invalid_input_and_methods(self):
        token = self.login()['sessionToken']
        for path in ('sound.php?id[]=bad', 'sound.php?id=bad', 'sounds.php?after[]=bad'):
            self.assertEqual(self.request(path, token=token)[0], 400)
        self.assertEqual(self.request('sounds.php', 'POST', {'filename':[]}, token)[0], 400)
        self.assertEqual(self.request('sounds.php', 'DELETE', token=token)[0], 405)
        self.assertEqual(self.request('sound.php', 'PATCH', token=token)[0], 405)

    def test_large_body_is_rejected_before_metadata_processing(self):
        token = self.login()['sessionToken']
        status, body, _ = self.request('sounds.php', 'POST', {'filename':'x' * 20000}, token)
        self.assertEqual(status, 413)
        self.assertFalse(body['ok'])

    def test_cleanup_configuration_failure_has_nonzero_exit(self):
        scripts = self.directory / 'scripts'; scripts.mkdir(exist_ok=True)
        public = self.directory / 'public'; public.mkdir(exist_ok=True)
        (public / 'api').symlink_to(self.api)
        cleanup = scripts / 'cleanup-cloud-audio.php'
        shutil.copyfile(auth.ROOT / 'scripts/cleanup-cloud-audio.php', cleanup)
        config = self.api / 'config.php'
        original = config.read_text(); config.unlink()
        environment = {key:value for key,value in os.environ.items() if not key.startswith('BLOBULAR_')}
        try:
            result = subprocess.run(['php', str(cleanup)], env=environment, capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertFalse(json.loads(result.stdout)['ok'])
            self.assertNotIn(str(self.directory), result.stdout)
        finally:
            config.write_text(original)

    def test_database_failure_is_generic(self):
        token = self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute('ALTER TABLE fixture_users_sounds RENAME TO hidden_sounds')
        try:
            status, body, _ = self.request('sounds.php', token=token)
            self.assertEqual(status, 500)
            self.assertNotIn('sqlite', json.dumps(body).lower())
            self.assertNotIn(str(self.directory), json.dumps(body))
        finally:
            with sqlite3.connect(self.database) as db:
                db.execute('ALTER TABLE hidden_sounds RENAME TO fixture_users_sounds')


# Authentication's own tests are run separately; reuse only its fixture helpers.
for name in dir(auth.AuthHTTPTests):
    if name.startswith('test_'):
        setattr(SoundHTTPTests, name, None)

if __name__ == '__main__':
    unittest.main(verbosity=2)
