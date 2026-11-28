<?php
// Disposable localhost MySQL only. Never reads config.php or production credentials.
declare(strict_types=1);
require dirname(__DIR__, 2) . '/public/api/_bootstrap.php';
require dirname(__DIR__, 2) . '/public/api/_account_deletion.php';
$port = $argv[1] ?? '';
if (!preg_match('/^[0-9]{1,5}$/D', $port)) { throw new RuntimeException('Disposable localhost MySQL port required.'); }
$pdo = new PDO("mysql:host=127.0.0.1;port=$port;charset=utf8mb4", 'root', '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$db = 'deletion_fixture_' . bin2hex(random_bytes(5));
$pdo->exec("CREATE DATABASE `$db`");
$pdo->exec("USE `$db`");
try {
    $pdo->exec('CREATE TABLE fixture_users (id INT UNSIGNED PRIMARY KEY, username VARCHAR(64), password_hash VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    foreach (['001-cloud-foundation.sql','003-subscription-entitlements.sql'] as $migration) {
        $sql=file_get_contents(dirname(__DIR__,2).'/infra/migrations/'.$migration);
        // Only actual session/audit DDL is needed; no unrelated fixture schema.
        $suffix=str_starts_with($migration,'001') ? 'sessions' : 'ent_log';
        preg_match('/CREATE TABLE `blobular_users_'.$suffix.'`.*?;/s',$sql,$match);
        $pdo->exec(str_replace('blobular_users','fixture_users',$match[0]));
    }
    $hash=password_hash('FixturePassword1!', PASSWORD_BCRYPT);
    $q=$pdo->prepare('INSERT INTO fixture_users(id,username,password_hash) VALUES (?,?,?)');
    foreach ([5,6] as $id) { $q->execute([$id,"fixture$id@example.invalid",$hash]); }
    $config=['users_table'=>'fixture_users','session_ttl_seconds'=>3600];
    $token5=issueAuthSession($pdo,$config,5)['sessionToken'];
    $token6=issueAuthSession($pdo,$config,6)['sessionToken'];
    $assert=static function(bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); echo "PASS $label\n"; };
    $first=requestAccountDeletion($pdo,$config,$token5,'FixturePassword1!');
    $assert($first['status']==='requested','MySQL pending receipt');
    $assert(requestAccountDeletion($pdo,$config,$token5,'FixturePassword1!')===$first,'MySQL idempotent receipt');
    $assert((int)$pdo->query('SELECT COUNT(*) FROM fixture_users_ent_log')->fetchColumn()===1,'MySQL exactly one audit');
    $assert(accountDeletionStatus($pdo,$config,6)===null,'MySQL account isolation');
    try { requestAccountDeletion($pdo,$config,$token6,'wrong'); throw new RuntimeException('Accepted wrong password'); }
    catch(AccountDeletionError $e) { $assert($e->status===403,'MySQL current-password safeguard'); }
    $pdo->exec("CREATE TRIGGER fail_request BEFORE INSERT ON fixture_users_ent_log FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture audit failure'");
    try { requestAccountDeletion($pdo,$config,$token6,'FixturePassword1!'); throw new RuntimeException('Accepted failed audit'); }
    catch(PDOException $e) { $assert(!$pdo->inTransaction() && accountDeletionStatus($pdo,$config,6)===null,'MySQL audit failure rolls back'); }
    $pdo->exec('DROP TRIGGER fail_request');
    $pdo->exec('UPDATE fixture_users_sessions SET revoked_at=1 WHERE user_id=6');
    try { requestAccountDeletion($pdo,$config,$token6,'FixturePassword1!'); throw new RuntimeException('Accepted revoked token'); }
    catch(AccountDeletionError $e) { $assert($e->status===401,'MySQL revoked-session safeguard'); }
    $assert((int)$pdo->query('SELECT COUNT(*) FROM fixture_users')->fetchColumn()===2,'MySQL accounts preserved');
    $assert(findAuthSession($pdo,$config,$token5)!==null,'MySQL valid session preserved');
} finally { if ($pdo->inTransaction()) $pdo->rollBack(); $pdo->exec("DROP DATABASE `$db`"); }
