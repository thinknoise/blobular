<?php

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

requirePostMethod();

$config = loadApiConfig();
$payload = readJsonBody();

$email = normalizedEmailFromPayload($payload);
$password = (string) ($payload['password'] ?? '');

validateEmail($email);
validatePasswordStrength($password, 'Password');

$pdo = createPdo($config);
ensureUsersTable($pdo, $config['users_table']);

try {
    $insertSql = sprintf(
        'INSERT INTO `%s` (`username`, `password_hash`) VALUES (:username, :password_hash)',
        $config['users_table']
    );

    $statement = $pdo->prepare($insertSql);
    $statement->execute([
        ':username' => $email,
        ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
    ]);

    respond(201, [
        'ok' => true,
        'message' => 'User created.',
        'userId' => (int) $pdo->lastInsertId(),
    ]);
} catch (PDOException $exception) {
    if ((string) $exception->getCode() === '23000') {
        respond(409, ['ok' => false, 'message' => 'Email already exists.']);
    }

    respond(500, ['ok' => false, 'message' => 'Database error while creating user.']);
}
