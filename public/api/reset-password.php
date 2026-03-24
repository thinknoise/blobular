<?php

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

requirePostMethod();

$config = loadApiConfig();
$payload = readJsonBody();

$email = normalizedEmailFromPayload($payload);
$currentPassword = (string) ($payload['currentPassword'] ?? '');
$newPassword = (string) ($payload['newPassword'] ?? '');

validateEmail($email);

if ($currentPassword === '') {
    respond(400, ['ok' => false, 'message' => 'Current password is required.']);
}

validatePasswordStrength($newPassword, 'New password');

$pdo = createPdo($config);
ensureUsersTable($pdo, $config['users_table']);

try {
    $querySql = sprintf(
        'SELECT `id`, `password_hash` FROM `%s` WHERE `username` = :username LIMIT 1',
        $config['users_table']
    );

    $queryStatement = $pdo->prepare($querySql);
    $queryStatement->execute([':username' => $email]);
    $row = $queryStatement->fetch();

    if (!$row || !is_array($row)) {
        respond(404, ['ok' => false, 'message' => 'User not found.']);
    }

    $currentHash = (string) ($row['password_hash'] ?? '');
    if ($currentHash === '' || !password_verify($currentPassword, $currentHash)) {
        respond(401, ['ok' => false, 'message' => 'Current password is incorrect.']);
    }

    if (password_verify($newPassword, $currentHash)) {
        respond(400, ['ok' => false, 'message' => 'New password must be different from current password.']);
    }

    $updateSql = sprintf(
        'UPDATE `%s` SET `password_hash` = :password_hash WHERE `id` = :id',
        $config['users_table']
    );

    $updateStatement = $pdo->prepare($updateSql);
    $updateStatement->execute([
        ':password_hash' => password_hash($newPassword, PASSWORD_BCRYPT),
        ':id' => (int) ($row['id'] ?? 0),
    ]);

    respond(200, ['ok' => true, 'message' => 'Password updated.']);
} catch (PDOException $exception) {
    respond(500, ['ok' => false, 'message' => 'Database error while resetting password.']);
}
