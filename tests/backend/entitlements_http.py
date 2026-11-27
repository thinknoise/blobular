#!/usr/bin/env python3
"""Authenticated subscription/save HTTP contracts, only disposable fixture data."""
import sys
sys.dont_write_bytecode = True
import sqlite3
import subprocess
import json
from pathlib import Path
import unittest
from sounds_http import SoundHTTPTests

class EntitlementHTTPTests(SoundHTTPTests):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with sqlite3.connect(cls.database) as db:
            db.executescript('''
            CREATE TABLE fixture_users_billing (user_id INTEGER PRIMARY KEY,app_account_token TEXT UNIQUE,created_at INTEGER);
            CREATE TABLE fixture_users_comp (user_id INTEGER PRIMARY KEY,granted_at INTEGER,revoked_at INTEGER);
            CREATE TABLE fixture_users_subs (environment TEXT,original_id TEXT,user_id INTEGER,transaction_id TEXT,product_id TEXT,expires_at INTEGER,revoked_at INTEGER,will_renew INTEGER,status TEXT,signed_at INTEGER,verified_until INTEGER,snapshot_hash TEXT,PRIMARY KEY(environment,original_id));
            CREATE TABLE fixture_users_iap_log (event_hash TEXT PRIMARY KEY,environment TEXT,transaction_id TEXT,original_id TEXT,user_id INTEGER,processed_at INTEGER);
            CREATE TABLE fixture_users_ent_log (id INTEGER PRIMARY KEY,user_id INTEGER,action TEXT,actor TEXT,reason TEXT,recorded_at INTEGER);
            ''')
    def setUp(self):
        super().setUp()
        with sqlite3.connect(self.database) as db:
            for suffix in ('comp','subs','billing','iap_log','ent_log'):
                db.execute('DELETE FROM fixture_users_'+suffix)
        config=self.base_config.replace('return [', "return ['cloud_authorization_mode'=>'entitlements',",1)
        (self.api/'config.php').write_text(config)
    def grant(self):
        with sqlite3.connect(self.database) as db:
            db.execute('INSERT INTO fixture_users_comp VALUES (1,1,NULL)')
    def revoke(self):
        with sqlite3.connect(self.database) as db:
            db.execute('UPDATE fixture_users_comp SET revoked_at=1')
    def test_subscription_requires_auth_and_does_not_trust_flags(self):
        for method,data in [('GET',None),('POST',{'transactionId':'101'})]:
            self.assertEqual(self.request('subscription.php',method,data)[0],401)
        token=self.login()['sessionToken']
        status,body,headers=self.request('subscription.php',token=token)
        self.assertEqual(status,200); self.assertFalse(body['subscription']['active'])
        self.assertEqual(headers['Cache-Control'],'no-store')
        account_token=body['appAccountToken']
        self.assertEqual(self.request('subscription.php',token=token)[1]['appAccountToken'],account_token)
        for data in ({'isSubscriber':True},{'transactionId':'101','active':True},{'transactionId':'not-an-id'}):
            self.assertEqual(self.request('subscription.php','POST',data,token)[0],400)
        self.assertEqual(self.request('subscription.php','POST',{'transactionId':'101'},token)[0],503)
        self.assertFalse(self.request('subscription.php',token=token)[1]['subscription']['active'])
    def test_free_denied_comp_allowed_revoked_cannot_finalize(self):
        token=self.login()['sessionToken']
        self.assertEqual(self.request('sounds.php','POST',self.input,token)[0],403)
        self.grant()
        self.assertTrue(self.request('subscription.php',token=token)[1]['subscription']['active'])
        record=self.begin_upload(token); self.put_fixture(record); self.revoke()
        self.assertEqual(self.request('sound.php?id='+record,'POST',{},token)[0],403)
        self.assertEqual(self.request('sounds.php',token=token)[1]['sounds'],[])
    def test_expired_subscriber_keeps_recordings(self):
        token=self.login()['sessionToken']; self.grant(); record=self.complete_upload(token); self.revoke()
        self.assertEqual(len(self.request('sounds.php',token=token)[1]['sounds']),1)
        self.assertEqual(self.request('sound.php?id='+record,token=token)[0],200)
        self.assertEqual(self.request('sound.php?id='+record,'DELETE',token=token)[0],200)
        self.assertEqual(self.request('sounds.php',token=token)[1]['sounds'],[])
    def test_private_cli_is_dry_run_by_default_and_audits_only_matching_account(self):
        source=(Path(__file__).resolve().parents[2]/'scripts/manage-entitlements.php').read_text()
        script=self.directory/'manage-entitlements.php'
        script.write_text(source.replace("dirname(__DIR__) . '/public/api/", "__DIR__ . '/api/"))
        # The copied bootstrap connects only to this suite's disposable SQLite DB.
        import os
        environment={**os.environ,'BLOBULAR_TEST_DATABASE':str(self.database)}
        arguments=['php',str(script),'--action=grant','--user-id=1','--expected-email=one@example.com','--actor=fixture','--reason=fixture grant']
        preview=subprocess.run(arguments,env=environment,capture_output=True,text=True,check=True)
        self.assertTrue(json.loads(preview.stdout)['dryRun'])
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users_comp').fetchone()[0],0)
        applied=subprocess.run([*arguments,'--apply'],env=environment,capture_output=True,text=True,check=True)
        self.assertTrue(json.loads(applied.stdout)['applied'])
        wrong=[arg if arg!='--expected-email=one@example.com' else '--expected-email=wrong@example.com' for arg in arguments]
        self.assertEqual(subprocess.run([*wrong,'--apply'],env=environment,capture_output=True).returncode,1)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute('SELECT user_id,actor,reason FROM fixture_users_ent_log').fetchall(),[(1,'fixture','fixture grant')])
            self.assertEqual(db.execute('SELECT user_id,revoked_at FROM fixture_users_comp').fetchall(),[(1,None)])
    def test_launch_grants_verify_both_existing_accounts_before_writing(self):
        source=(Path(__file__).resolve().parents[2]/'scripts/manage-entitlements.php').read_text()
        script=self.directory/'manage-launch.php'
        script.write_text(source.replace("dirname(__DIR__) . '/public/api/", "__DIR__ . '/api/"))
        import os
        environment={**os.environ,'BLOBULAR_TEST_DATABASE':str(self.database)}
        arguments=['php',str(script),'--action=grant','--launch-accounts','--actor=fixture','--reason=owner-approved launch']
        with sqlite3.connect(self.database) as db:
            # Disposable existing-account fixtures, not a production registration.
            db.execute('INSERT INTO fixture_users (id,username,password_hash) VALUES (5,?,?)',('dirtytuba@gmail.com','unused fixture hash'))
            db.execute('INSERT INTO fixture_users (id,username,password_hash) VALUES (6,?,?)',('wrong@example.invalid','unused fixture hash'))
        try:
            failed=subprocess.run([*arguments,'--apply'],env=environment,capture_output=True,text=True)
            self.assertEqual(failed.returncode,1)
            with sqlite3.connect(self.database) as db:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users_comp').fetchone()[0],0)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users_ent_log').fetchone()[0],0)
                db.execute('UPDATE fixture_users SET username=? WHERE id=6',('blobular-api-test-2b7f0ec7d7ff@example.com',))
            preview=subprocess.run(arguments,env=environment,capture_output=True,text=True,check=True)
            self.assertEqual([a['id'] for a in json.loads(preview.stdout)['accounts']],[5,6])
            with sqlite3.connect(self.database) as db:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users_comp').fetchone()[0],0)
            for _ in range(2):
                subprocess.run([*arguments,'--apply'],env=environment,capture_output=True,text=True,check=True)
            with sqlite3.connect(self.database) as db:
                self.assertEqual(db.execute('SELECT user_id,revoked_at FROM fixture_users_comp ORDER BY user_id').fetchall(),[(5,None),(6,None)])
                self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users_ent_log').fetchone()[0],4)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users').fetchone()[0],4)
        finally:
            with sqlite3.connect(self.database) as db:
                for suffix in ('comp','ent_log'):db.execute('DELETE FROM fixture_users_'+suffix+' WHERE user_id IN (5,6)')
                db.execute('DELETE FROM fixture_users WHERE id IN (5,6)')
    def test_public_notifications_cannot_assert_entitlements(self):
        self.assertEqual(self.request('app-store-notifications.php','GET')[0],405)
        self.assertEqual(self.request('app-store-notifications.php','POST',{'active':True})[0],400)
        self.assertEqual(self.request('app-store-notifications.php','POST',{'signedPayload':'not-a-real-signed-notification'})[0],503)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM fixture_users_subs').fetchone()[0],0)

if __name__=='__main__':
    suite=unittest.TestSuite(EntitlementHTTPTests(name) for name in EntitlementHTTPTests.__dict__ if name.startswith('test_'))
    raise SystemExit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())
