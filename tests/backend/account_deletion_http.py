#!/usr/bin/env python3
"""Account deletion initiation; disposable DB only, no production or object store."""
import sys
sys.dont_write_bytecode = True
import sqlite3
import unittest
from run import AuthHTTPTests

class AccountDeletionHTTPTests(AuthHTTPTests):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with sqlite3.connect(cls.database) as db:
            db.execute('''CREATE TABLE fixture_users_ent_log (id INTEGER PRIMARY KEY,
                user_id INTEGER, action TEXT, actor TEXT, reason TEXT, recorded_at INTEGER)''')
    def setUp(self):
        super().setUp()
        with sqlite3.connect(self.database) as db:
            db.execute('DROP TRIGGER IF EXISTS fail_deletion_audit')
            db.execute('DELETE FROM fixture_users_ent_log')
    def submit(self, token, **changes):
        body = {'currentPassword':'TestPassword1!', 'confirmation':'DELETE ACCOUNT', **changes}
        return self.request('account-deletion.php', 'POST', body, token)
    def test_auth_required_and_get_never_creates_request(self):
        self.assertEqual(self.request('account-deletion.php')[0],401)
        self.assertEqual(self.submit(None)[0],401)
        token=self.login()['sessionToken']
        status,body,headers=self.request('account-deletion.php',token=token)
        self.assertEqual(status,200); self.assertIsNone(body['request'])
        self.assertEqual(headers['Cache-Control'],'no-store')
        self.assertEqual(self.request('account-deletion.php','DELETE',token=token)[0],405)
    def test_requires_current_password_confirmation_and_no_client_identity(self):
        token=self.login()['sessionToken']
        for data,code in [({'currentPassword':'wrong'},403),({'confirmation':'delete'},400),
                          ({'currentPassword':[]},400),({'userId':2},400)]:
            self.assertEqual(self.submit(token,**data)[0],code)
        self.assertIsNone(self.request('account-deletion.php',token=token)[1]['request'])
    def test_request_is_audited_idempotent_and_does_not_delete_or_revoke(self):
        token=self.login()['sessionToken']; other=self.login('two@example.com')['sessionToken']
        status,body,_=self.submit(token)
        self.assertEqual(status,200); self.assertEqual(body['userId'],1)
        self.assertEqual(body['request']['status'],'requested')
        self.assertGreater(body['request']['id'],0)
        self.assertEqual(self.submit(token)[1],body)
        self.assertEqual(self.request('account-deletion.php',token=token)[1],body)
        self.assertIsNone(self.request('account-deletion.php?userId=1',token=other)[1]['request'])
        self.assertEqual(self.request('account-deletion.php?userId=2',token=token)[1],body)
        self.assertEqual(self.request('me.php',token=token)[0],200)
        with sqlite3.connect(self.database) as db:
            rows=db.execute('SELECT user_id,action,actor,reason FROM fixture_users_ent_log').fetchall()
            self.assertEqual(len(rows),1); self.assertEqual(rows[0][:3],(1,'request-account-deletion','account:1'))
            self.assertNotIn('TestPassword1!',rows[0][3])
            self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users').fetchone()[0],2)
    def test_revoked_or_expired_sessions_cannot_request(self):
        token=self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute('UPDATE fixture_users_sessions SET revoked_at=1')
        self.assertEqual(self.submit(token)[0],401)
        token=self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute('UPDATE fixture_users_sessions SET expires_at=1')
        self.assertEqual(self.submit(token)[0],401)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users_ent_log').fetchone()[0],0)
    def test_failed_audit_never_returns_success_and_can_retry(self):
        token=self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute("CREATE TRIGGER fail_deletion_audit BEFORE INSERT ON fixture_users_ent_log BEGIN SELECT RAISE(ABORT,'fixture'); END")
        self.assertEqual(self.submit(token)[0],503)
        self.assertIsNone(self.request('account-deletion.php',token=token)[1]['request'])
        with sqlite3.connect(self.database) as db:
            db.execute('DROP TRIGGER fail_deletion_audit')
        self.assertEqual(self.submit(token)[0],200)
    def test_missing_migration_fails_closed(self):
        token=self.login()['sessionToken']
        with sqlite3.connect(self.database) as db:
            db.execute('ALTER TABLE fixture_users_ent_log RENAME TO saved_log')
        try:
            self.assertEqual(self.submit(token)[0],503)
        finally:
            with sqlite3.connect(self.database) as db:
                db.execute('ALTER TABLE saved_log RENAME TO fixture_users_ent_log')

if __name__=='__main__':
    suite=unittest.TestSuite(AccountDeletionHTTPTests(name) for name in AccountDeletionHTTPTests.__dict__ if name.startswith('test_'))
    raise SystemExit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())
