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

try {
    ensureUsersTable($pdo, $config['users_table']);
    $result = loginAccount($pdo, $config, $email, $password);
    if ($result === null) {
        respond(401, ['ok' => false, 'message' => 'Invalid username or password.']);
    }
    respond(200, $result);
} catch (Throwable $exception) {
    respond(500, ['ok' => false, 'message' => 'Unable to establish account session.']);
}
