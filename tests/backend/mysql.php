<?php
// Invoked only by mysql.py against its disposable container's localhost port.
declare(strict_types=1);
require dirname(__DIR__, 2) . '/public/api/_bootstrap.php';

$port = filter_var($argv[1] ?? '', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1024, 'max_range' => 65535]]);
if ($port === false) { throw new RuntimeException('A disposable MySQL port is required.'); }
$pdo = new PDO("mysql:host=127.0.0.1;port=$port;charset=utf8mb4", 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$pdo->exec('CREATE DATABASE blobular_auth_fixture');
$pdo->exec('USE blobular_auth_fixture');
$config = ['users_table' => 'blobular_users', 'session_ttl_seconds' => 60];
$count = 0;
function check(bool $condition, string $description): void {
    global $count;
    if (!$condition) { throw new RuntimeException($description); }
    $count++;
    echo "PASS $description\n";
}
function expectSqlFailure(callable $operation, string $description): void {
    try { $operation(); } catch (PDOException $exception) { check(true, $description); return; }
    throw new RuntimeException($description);
}
ensureUsersTable($pdo, $config['users_table']);
$hash = password_hash('TestPassword1!', PASSWORD_BCRYPT);
$insert = $pdo->prepare('INSERT INTO blobular_users (username, password_hash) VALUES (?, ?)');
$insert->execute(['one@example.com', $hash]);
$insert->execute(['two@example.com', $hash]);
$migration = file_get_contents(dirname(__DIR__, 2) . '/infra/migrations/001-cloud-foundation.sql');
$pdo->exec($migration);
check($pdo->query("SHOW TABLE STATUS LIKE 'blobular_users_sounds'")->fetch()['Row_format'] === 'Dynamic', 'migration overrides COMPACT default');
check($pdo->query('SELECT password_hash FROM blobular_users WHERE id=1')->fetchColumn() === $hash, 'migration preserves existing bcrypt accounts');
check(loginAccount($pdo, $config, 'one@example.com', 'wrong', 1000) === null, 'wrong password cannot create session');
$session = loginAccount($pdo, $config, 'one@example.com', 'TestPassword1!', 1000);
check($session['userId'] === 1 && isset($session['createdAt'], $session['message'], $session['ok']), 'login response stays compatible');
check($pdo->query('SELECT token_hash FROM blobular_users_sessions')->fetchColumn() === hash('sha256', $session['sessionToken']), 'only token hash stored');
check((int) findAuthSession($pdo, $config, $session['sessionToken'], 1059)['id'] === 1, 'valid session resolves its owner');
check(findAuthSession($pdo, $config, $session['sessionToken'], 1060) === null, 'exact expiry boundary rejects token');
revokeAuthSession($pdo, $config, $session['sessionToken'], 1001);
check(findAuthSession($pdo, $config, $session['sessionToken'], 1002) === null, 'revocation rejects token');
expectSqlFailure(fn() => issueAuthSession($pdo, $config, 999), 'session foreign key rejects missing owner');
$indexes = $pdo->query('SHOW INDEX FROM blobular_users_sessions')->fetchAll();
$indexNames = array_column($indexes, 'Key_name');
check(count(array_intersect(['PRIMARY', 'session_user', 'session_expiry'], $indexNames)) === 3, 'session lookup, owner and expiry indexes exist');
expectSqlFailure(fn() => $pdo->exec($migration), 'migration reapply fails rather than silently replacing tables');

// Enforce ownership and full S3 object-key uniqueness with the actual MySQL DDL.
$soundInsert = $pdo->prepare('INSERT INTO blobular_users_sounds
    (id,owner_user_id,storage_bucket,storage_key,title,original_filename,mime_type,byte_size,source_kind)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
$values = ['00000000-0000-0000-0000-000000000001', 1, 'fixture-bucket', 'private/one.wav', 'One', 'one.wav', 'audio/wav', 32, 'upload'];
$soundInsert->execute($values);
check($pdo->query('SELECT visibility FROM blobular_users_sounds')->fetchColumn() === 'private', 'sounds default to private');
$values[0] = '00000000-0000-0000-0000-000000000002';
expectSqlFailure(fn() => $soundInsert->execute($values), 'duplicate S3 object is rejected');
$values[3] = 'private/missing.wav'; $values[1] = 999;
expectSqlFailure(fn() => $soundInsert->execute($values), 'sound foreign key rejects missing owner');
expectSqlFailure(fn() => $pdo->exec('DELETE FROM blobular_users WHERE id=1'), 'sound owner deletion is restricted');

// The production login must wait for a password change and re-read its new hash.
$pdo->beginTransaction();
$pdo->query('SELECT id, password_hash FROM blobular_users WHERE username="one@example.com" LIMIT 1 FOR UPDATE')->fetch();
$childCode = <<<'CODE'
require $argv[1];
$pdo = new PDO('mysql:host=127.0.0.1;port=' . $argv[2] . ';dbname=blobular_auth_fixture', 'root', '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
echo "started\n"; flush();
echo json_encode(loginAccount($pdo, ['users_table'=>'blobular_users','session_ttl_seconds'=>60], 'one@example.com', 'TestPassword1!'));
CODE;
$process = proc_open([PHP_BINARY, '-r', $childCode, dirname(__DIR__, 2) . '/public/api/_sessions.php', (string) $port],
    [0 => ['pipe','r'], 1 => ['pipe','w'], 2 => ['pipe','w']], $pipes);
try {
    check(trim(fgets($pipes[1])) === 'started', 'concurrent login process starts');
    $waiting = false;
    for ($attempt = 0; $attempt < 100; $attempt++) {
        if ((int) $pdo->query('SELECT COUNT(*) FROM performance_schema.data_lock_waits')->fetchColumn() > 0) { $waiting = true; break; }
        usleep(50000);
    }
    check($waiting, 'login waits on password-change row lock');
    $update = $pdo->prepare('UPDATE blobular_users SET password_hash=? WHERE id=1');
    $update->execute([password_hash('ChangedPassword2!', PASSWORD_BCRYPT)]);
    revokeUserSessions($pdo, $config, 1);
    $pdo->commit();
    check(stream_get_contents($pipes[1]) === 'null', 'old password cannot mint session after concurrent change');
    $error = stream_get_contents($pipes[2]);
    foreach ($pipes as $pipe) { fclose($pipe); }
    check(proc_close($process) === 0 && $error === '', 'concurrent login exits cleanly');
    $process = null;
} finally {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    if (is_resource($process)) { proc_terminate($process); proc_close($process); }
}
$session = loginAccount($pdo, $config, 'one@example.com', 'ChangedPassword2!');
check($session !== null, 'new password logs in after change');

// Failure while revoking must roll back the password update on InnoDB.
$pdo->beginTransaction();
$pdo->prepare('UPDATE blobular_users SET password_hash=? WHERE id=1')->execute([password_hash('Uncommitted3!', PASSWORD_BCRYPT)]);
$pdo->rollBack();
check(loginAccount($pdo, $config, 'one@example.com', 'ChangedPassword2!') !== null, 'password transaction rollback preserves prior hash');
$version = $pdo->query('SELECT VERSION()')->fetchColumn();
echo "$count MySQL checks passed on $version\n";
