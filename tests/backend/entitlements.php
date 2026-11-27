<?php
declare(strict_types=1);
require_once __DIR__ . '/sounds.php';

final class FixtureAppleVerifier implements AppleSubscriptionVerifier
{
    public array $facts = [];
    public bool $fail = false;
    public function transaction(string $id, string $token): array {
        if ($this->fail) { throw new EntitlementError(503, 'Fixture verifier unavailable.'); }
        return $this->facts;
    }
    public function notification(string $signed): array { return $this->transaction('', ''); }
}

$pdo = isset($argv[1])
    ? new PDO('mysql:host=127.0.0.1;port=' . (int)$argv[1], 'root', '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION])
    : new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
if ($mysql) {
    $pdo->exec('CREATE DATABASE blobular_entitlements_fixture');
    $pdo->exec('USE blobular_entitlements_fixture');
    $pdo->exec('CREATE TABLE ent_fixture (id INT UNSIGNED PRIMARY KEY, username VARCHAR(64) NOT NULL) ENGINE=InnoDB');
    foreach (['001-cloud-foundation.sql','002-cloud-audio-lifecycle.sql','003-subscription-entitlements.sql'] as $name) {
        $pdo->exec(str_replace('blobular_users', 'ent_fixture', file_get_contents(dirname(__DIR__,2).'/infra/migrations/'.$name)));
    }
} else {
    $pdo->exec('CREATE TABLE ent_fixture (id INTEGER PRIMARY KEY,username TEXT)');
    $pdo->exec('CREATE TABLE ent_fixture_billing (user_id INTEGER PRIMARY KEY,app_account_token TEXT UNIQUE,created_at INTEGER)');
    $pdo->exec('CREATE TABLE ent_fixture_comp (user_id INTEGER PRIMARY KEY,granted_at INTEGER,revoked_at INTEGER)');
    $pdo->exec('CREATE TABLE ent_fixture_subs (environment TEXT,original_id TEXT,user_id INTEGER,transaction_id TEXT,product_id TEXT,expires_at INTEGER,revoked_at INTEGER,will_renew INTEGER,status TEXT,signed_at INTEGER,verified_until INTEGER,snapshot_hash TEXT,PRIMARY KEY(environment,original_id))');
    $pdo->exec('CREATE TABLE ent_fixture_iap_log (event_hash TEXT PRIMARY KEY,environment TEXT,transaction_id TEXT,original_id TEXT,user_id INTEGER,processed_at INTEGER)');
    $pdo->exec('CREATE TABLE ent_fixture_ent_log (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT,actor TEXT,reason TEXT,recorded_at INTEGER)');
    $pdo->exec('CREATE TABLE ent_fixture_sounds (id TEXT PRIMARY KEY,owner_user_id INTEGER,storage_bucket TEXT,storage_key TEXT,title TEXT,original_filename TEXT,mime_type TEXT,byte_size INTEGER,source_kind TEXT,visibility TEXT,state TEXT,staging_key TEXT,checksum_sha256 TEXT,upload_expires_at INTEGER,cleanup_after INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
}
for ($id=1; $id<=8; $id++) {
    $pdo->prepare('INSERT INTO ent_fixture (id,username) VALUES (?,?)')->execute([$id,"fixture$id@example.invalid"]);
}
putenv('BLOBULAR_APPLE_PRODUCT_IDS=com.example.fixture.monthly');
putenv('BLOBULAR_APPLE_ENVIRONMENT=Production');
putenv('BLOBULAR_CLOUD_AUTHORIZATION_MODE=entitlements');
putenv('BLOBULAR_CLOUD_TEST_ACCOUNT_IDS=1,6');
$config = ['users_table'=>'ent_fixture'];
$apple = new FixtureAppleVerifier(); $service = new SubscriptionEntitlements($pdo,$config,$apple);
$count = 0;
$check = static function(bool $ok,string $name) use (&$count): void {
    if (!$ok) { throw new RuntimeException($name); } $count++; echo "PASS $name\n";
};
$denied = static function(callable $call,int $status,string $name) use ($check): void {
    try { $call(); } catch (EntitlementError|AudioApiError $error) { $check($error->status===$status,$name); return; }
    throw new RuntimeException($name);
};
$now=time();
$check(!$service->status(1)['active'],'free account has no subscriber flag');
$denied(fn()=>requireCloudAudioWriteAccess(1,$pdo,$config),403,'legacy allowlist cannot bypass entitlement mode');
$denied(fn()=>$service->complimentary(2,'wrong@example.invalid',true,'operator','fixture'),409,'admin expected-email guard');
$service->complimentary(2,'fixture2@example.invalid',true,'fixture-operator','complimentary test');
$check($service->status(2,false,$now+315360000)['active'],'complimentary access does not expire');
$check($service->status(2)['expiresAt']===null,'complimentary has no expiry');
requireCloudAudioWriteAccess(2,$pdo,$config); $check(true,'complimentary grants the effective save entitlement');
$check((int)$pdo->query('SELECT COUNT(*) FROM ent_fixture_ent_log')->fetchColumn()===1,'complimentary grant is audited');
$token=$service->accountToken(3);
$check($token===$service->accountToken(3),'StoreKit account token is stable and server issued');
$fact=['originalId'=>'100','transactionId'=>'101','productId'=>'com.example.fixture.monthly','environment'=>'Production',
    'appAccountToken'=>$token,'status'=>'active','expiresAt'=>$now+3600,'signedAt'=>$now*1000,'willRenew'=>true,'revokedAt'=>null];
$apple->facts=[$fact]; $service->restore(3,'101',$now);
$check($service->status(3,false,$now)['active'],'verified Apple subscriber allowed');
requireCloudAudioWriteAccess(3,$pdo,$config); $check(true,'verified Apple subscriber passes real Cloud save gate');
$service->restore(3,'101',$now+1);
$check((int)$pdo->query('SELECT COUNT(*) FROM ent_fixture_subs')->fetchColumn()===1,'duplicate transaction has one entitlement');
$check((int)$pdo->query('SELECT COUNT(*) FROM ent_fixture_iap_log')->fetchColumn()===1,'duplicate transaction has one audit event');
$denied(fn()=>$service->restore(4,'101',$now),409,'purchase token cannot be reassigned to unrelated account');
$apple->facts=[array_replace($fact,['appAccountToken'=>$service->accountToken(4)])];
$denied(fn()=>$service->restore(4,'101',$now),409,'original transaction binding independently prevents reassignment');
foreach (['environment'=>'Sandbox','productId'=>'unapproved','signedAt'=>($now+600)*1000] as $key=>$value) {
    $apple->facts=[array_replace($fact,[$key=>$value])];
    $denied(fn()=>$service->restore(3,'101',$now),409,'reject mismatched verified '.$key);
}
$cancelled=array_replace($fact,['willRenew'=>false,'signedAt'=>($now+1)*1000]);
$apple->facts=[$cancelled]; $service->restore(3,'101',$now+1);
$check($service->status(3,false,$now+2)['active'] && !$service->status(3,false,$now+2)['willRenew'],'cancellation keeps paid time until expiry');
$expired=array_replace($cancelled,['status'=>'expired','expiresAt'=>$now-1,'signedAt'=>($now+2)*1000]);
$apple->facts=[$expired]; $service->restore(3,'101',$now+2);
$check(!$service->status(3,false,$now+2)['active'],'expired subscriber loses new save privileges');
$denied(fn()=>requireCloudAudioWriteAccess(3,$pdo,$config),403,'expired Apple subscriber denied real Cloud saves');
$active=array_replace($fact,['transactionId'=>'102','signedAt'=>($now+3)*1000]);
$apple->facts=[$active]; $service->restore(3,'102',$now+3);
$revoked=array_replace($active,['status'=>'revoked','revokedAt'=>$now,'signedAt'=>($now+4)*1000]);
$apple->facts=[$revoked]; $service->notification('fixture-signed-notification');
$check(!$service->status(3,false,$now+5)['active'],'refund/revocation removes Apple paid privileges');
$events=(int)$pdo->query('SELECT COUNT(*) FROM ent_fixture_iap_log')->fetchColumn();
$service->notification('duplicate-fixture-notification');
$check((int)$pdo->query('SELECT COUNT(*) FROM ent_fixture_iap_log')->fetchColumn()===$events,'duplicate notification is idempotent');
$apple->facts=[$active]; $service->restore(3,'102',$now+5);
$check(!$service->status(3,false,$now+5)['active'],'older Apple payload cannot undo revocation');
$service->complimentary(3,'fixture3@example.invalid',true,'fixture-operator','independent grant');
$apple->fail=true;
$check($service->status(3,true,$now+1000)['active'],'Apple failure/revocation does not cancel an independent complimentary grant');
$service->complimentary(3,'fixture3@example.invalid',false,'fixture-operator','remove fixture grant');
$denied(fn()=>$service->requireSubscriber(3,$now+1000),503,'stale Apple cache with verification outage fails closed');
$apple->fail=false;

// Use the real Cloud service with a fake object store: no credentials or AWS calls.
$store=new FixtureAudioStore(); $library=new CloudAudioLibrary($pdo,$config,$store);
$input=['filename'=>'fixture.wav','mimeType'=>'audio/wav','byteSize'=>32,'checksumSha256'=>hash('sha256','fixture')];
$denied(fn()=>$library->beginUpload(1,$input),403,'free user cannot create S3 upload authorization');
$pending=$library->beginUpload(2,$input); $id=$pending['id'];
$store->objects['cloud-library/staging/2/'.$id]=['bytes'=>32,'mime'=>'audio/wav','checksum'=>base64_encode(hash('sha256','fixture',true)),'etag'=>'"etag"'];
$service->complimentary(2,'fixture2@example.invalid',false,'fixture-operator','revoke before completion');
$before=$store->calls;
$denied(fn()=>$library->complete(2,$id),403,'revoked entitlement cannot finalize a pending save');
$check($store->calls===$before,'denied completion does not reach object storage');
$service->complimentary(2,'fixture2@example.invalid',true,'fixture-operator','restore fixture access');
$library->complete(2,$id);
$service->complimentary(2,'fixture2@example.invalid',false,'fixture-operator','simulate loss of entitlement');
$check(count($library->list(2)['sounds'])===1,'loss of subscription preserves existing recording metadata');
$check(isset($library->download(2,$id)['download']),'expired/free account retains owned download access');
$library->delete(2,$id);
$check(count($library->list(2)['sounds'])===0,'expired/free account retains owned deletion access');
$check(!isset($store->objects['cloud-library/saved/2/'.$id]),'only owned saved audio removed by explicit delete');
if ($mysql) {
    $service->complimentary(2,'fixture2@example.invalid',true,'fixture-operator','race setup');
    $pending=$library->beginUpload(2,$input);
    $pdo->beginTransaction();
    $pdo->query('SELECT id FROM ent_fixture WHERE id=2 FOR UPDATE')->fetch();
    $pdo->exec('UPDATE ent_fixture_comp SET revoked_at=1 WHERE user_id=2');
    $child = <<<'CODE'
require $argv[1];
$pdo=new PDO('mysql:host=127.0.0.1;port='.$argv[2].';dbname=blobular_entitlements_fixture','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$store=new FixtureAudioStore(); $library=new CloudAudioLibrary($pdo,['users_table'=>'ent_fixture'],$store);
echo "started\n"; flush();
try { $library->complete(2,$argv[3]); echo 'unexpected'; }
catch (EntitlementError $error) { echo $error->status.':'.$store->calls; }
CODE;
    $process=proc_open([PHP_BINARY,'-r',$child,__DIR__.'/sounds.php',$argv[1],$pending['id']],
        [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    try {
        $check(trim(fgets($pipes[1]))==='started','concurrent entitlement completion starts');
        $waiting=false;
        for ($attempt=0;$attempt<100;$attempt++) {
            if ((int)$pdo->query('SELECT COUNT(*) FROM performance_schema.data_lock_waits')->fetchColumn()>0) { $waiting=true; break; }
            usleep(50000);
        }
        $check($waiting,'completion waits on concurrent entitlement revocation');
        $pdo->commit();
        $check(stream_get_contents($pipes[1])==='403:0','committed revocation prevents completion and all storage calls');
        $error=stream_get_contents($pipes[2]);
        foreach ($pipes as $pipe) { fclose($pipe); }
        $check(proc_close($process)===0 && $error==='','concurrent entitlement completion exits cleanly');
        $process=null;
    } finally {
        if ($pdo->inTransaction()) { $pdo->rollBack(); }
        if (is_resource($process)) { proc_terminate($process); proc_close($process); }
    }
}
putenv('BLOBULAR_CLOUD_AUTHORIZATION_MODE');
requireCloudAudioWriteAccess(6);
$denied(fn()=>requireCloudAudioWriteAccess(7),403,'default rollout retains restricted account gate');
putenv('BLOBULAR_CLOUD_AUTHORIZATION_MODE=unknown');
$denied(fn()=>requireCloudAudioWriteAccess(6,$pdo,$config),503,'invalid rollout mode fails closed');
echo "$count entitlement checks passed (" . ($mysql?'MySQL':'SQLite') . ")\n";
