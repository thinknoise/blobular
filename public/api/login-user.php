<?php

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

requirePostMethod();

$config = loadApiConfig();
$payload = readJsonBody();

$email = normalizedEmailFromPayload($payload);
$password = (string) ($payload['password'] ?? '');

validateEmail($email);

if ($password === '') {
    respond(400, ['ok' => false, 'message' => 'Password is required.']);
}

$pdo = createPdo($config);
ensureUsersTable($pdo, $config['users_table']);

try {
    $querySql = sprintf(
        'SELECT `id`, `password_hash`, `created_at` FROM `%s` WHERE `username` = :username LIMIT 1',
        $config['users_table']
    );

    $statement = $pdo->prepare($querySql);
    $statement->execute([':username' => $email]);
    $row = $statement->fetch();

    if (!$row || !is_array($row)) {
        respond(401, ['ok' => false, 'message' => 'Invalid username or password.']);
    }

    $passwordHash = (string) ($row['password_hash'] ?? '');
    if ($passwordHash === '' || !password_verify($password, $passwordHash)) {
        respond(401, ['ok' => false, 'message' => 'Invalid username or password.']);
    }

    respond(200, [
        'ok' => true,
        'message' => 'Login successful.',
        'userId' => (int) ($row['id'] ?? 0),
        'createdAt' => (string) ($row['created_at'] ?? ''),
    ]);
} catch (PDOException $exception) {
    respond(500, ['ok' => false, 'message' => 'Database error while logging in.']);
}
