<?php
// Private CLI only; nothing in this directory is copied into dist/.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/public/api/_bootstrap.php';
require_once dirname(__DIR__) . '/public/api/_entitlements.php';
register_shutdown_function(static function (): void { if (http_response_code() >= 400) { exit(1); } });

try {
    $options = getopt('', ['action:', 'user-id:', 'expected-email:', 'actor:', 'reason:', 'apply']);
    foreach (['action','user-id','expected-email','actor','reason'] as $key) {
        if (!isset($options[$key]) || !is_string($options[$key]) || $options[$key] === '') { throw new RuntimeException(); }
    }
    if (!in_array($options['action'], ['grant','revoke'], true) || !preg_match('/^[1-9][0-9]{0,9}$/D', $options['user-id'])
        || (int)$options['user-id']>4294967295) { throw new RuntimeException(); }
    $config = loadApiConfig(); $pdo = createPdo($config);
    $query = $pdo->prepare("SELECT id,username FROM `{$config['users_table']}` WHERE id=:id");
    $query->execute([':id'=>(int)$options['user-id']]); $user = $query->fetch(PDO::FETCH_ASSOC);
    if (!$user || $user['username'] !== $options['expected-email']) {
        fwrite(STDERR, "Account identity mismatch; no changes made.\n"); exit(1);
    }
    if (!array_key_exists('apply', $options)) {
        echo json_encode(['dryRun'=>true, 'action'=>$options['action'], 'userId'=>(int)$user['id'],
            'username'=>$user['username'], 'source'=>'complimentary', 'expiresAt'=>null]), "\n";
        exit(0);
    }
    (new SubscriptionEntitlements($pdo, $config))->complimentary((int)$user['id'], $user['username'],
        $options['action']==='grant', $options['actor'], $options['reason']);
    echo json_encode(['applied'=>true, 'userId'=>(int)$user['id'], 'action'=>$options['action']]), "\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Entitlement command failed; no unaudited grant is committed. Check arguments, migration and private server configuration.\n");
    exit(1);
}
