<?php
// Private CLI only; nothing in this directory is copied into dist/.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/public/api/_bootstrap.php';
require_once dirname(__DIR__) . '/public/api/_entitlements.php';
register_shutdown_function(static function (): void { if (http_response_code() >= 400) { exit(1); } });

try {
    $options = getopt('', ['action:', 'user-id:', 'expected-email:', 'actor:', 'reason:', 'apply', 'launch-accounts']);
    foreach (['action','actor','reason'] as $key) {
        if (!isset($options[$key]) || !is_string($options[$key]) || $options[$key] === '') { throw new RuntimeException(); }
    }
    if (!in_array($options['action'], ['grant','revoke'], true)) { throw new RuntimeException(); }
    if (array_key_exists('launch-accounts', $options)) {
        if ($options['action'] !== 'grant' || isset($options['user-id']) || isset($options['expected-email'])) { throw new RuntimeException(); }
        // Owner-confirmed existing accounts; apply re-verifies both under row locks.
        $accounts = [['id'=>5,'email'=>'dirtytuba@gmail.com'],
            ['id'=>6,'email'=>'blobular-api-test-2b7f0ec7d7ff@example.com']];
    } else {
        if (!isset($options['user-id'],$options['expected-email']) || !is_string($options['user-id'])
            || !is_string($options['expected-email']) || $options['expected-email'] === ''
            || !preg_match('/^[1-9][0-9]{0,9}$/D', $options['user-id']) || (int)$options['user-id']>4294967295) { throw new RuntimeException(); }
        $accounts = [['id'=>(int)$options['user-id'],'email'=>$options['expected-email']]];
    }
    $config = loadApiConfig(); $pdo = createPdo($config);
    $query = $pdo->prepare("SELECT id,username FROM `{$config['users_table']}` WHERE id=:id");
    foreach ($accounts as $account) {
        $query->execute([':id'=>$account['id']]); $user = $query->fetch(PDO::FETCH_ASSOC);
        if (!$user || $user['username'] !== $account['email']) {
            fwrite(STDERR, "Account identity mismatch; no changes made.\n"); exit(1);
        }
    }
    $identity = count($accounts) === 1 ? ['userId'=>$accounts[0]['id'], 'username'=>$accounts[0]['email']] : [];
    if (!array_key_exists('apply', $options)) {
        echo json_encode($identity + ['dryRun'=>true, 'action'=>$options['action'], 'accounts'=>$accounts,
            'source'=>'complimentary', 'expiresAt'=>null]), "\n";
        exit(0);
    }
    (new SubscriptionEntitlements($pdo, $config))->complimentaryAccounts($accounts,
        $options['action']==='grant', $options['actor'], $options['reason']);
    echo json_encode($identity + ['applied'=>true, 'accounts'=>$accounts, 'action'=>$options['action']]), "\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Entitlement command failed; no unaudited grant is committed. Check arguments, migration and private server configuration.\n");
    exit(1);
}
