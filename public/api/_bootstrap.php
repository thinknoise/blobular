<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/_sessions.php';

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function requirePostMethod(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['ok' => false, 'message' => 'Method not allowed.']);
    }
}

function readJsonBody(): array
{
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody ?: '', true);

    if (!is_array($payload)) {
        respond(400, ['ok' => false, 'message' => 'Invalid JSON body.']);
    }

    // Reject structured/non-string credentials before PHP casts can emit warnings
    // containing filesystem paths (even when the host enables display_errors).
    foreach (['email', 'username', 'password', 'currentPassword', 'newPassword'] as $field) {
        if (array_key_exists($field, $payload) && !is_string($payload[$field])) {
            respond(400, ['ok' => false, 'message' => 'Account credentials must be strings.']);
        }
    }

    return $payload;
}

function loadApiConfig(): array
{
    $configFile = __DIR__ . '/config.php';
    $fileConfig = [];

    if (is_file($configFile)) {
        $loaded = require $configFile;
        if (!is_array($loaded)) {
            respond(500, ['ok' => false, 'message' => 'Server config is invalid.']);
        }
        $fileConfig = $loaded;
    }

    $config = [
        'db_host' => trim((string) ($fileConfig['db_host'] ?? (getenv('BLOBULAR_DB_HOST') ?: ''))),
        'db_name' => trim((string) ($fileConfig['db_name'] ?? (getenv('BLOBULAR_DB_NAME') ?: ''))),
        'db_user' => trim((string) ($fileConfig['db_user'] ?? (getenv('BLOBULAR_DB_USER') ?: ''))),
        'db_pass' => (string) ($fileConfig['db_pass'] ?? (getenv('BLOBULAR_DB_PASS') ?: '')),
        'users_table' => trim((string) ($fileConfig['users_table'] ?? (getenv('BLOBULAR_USERS_TABLE') ?: 'app_users'))),
    ];

    if (
        $config['db_host'] === '' ||
        $config['db_name'] === '' ||
        $config['db_user'] === '' ||
        $config['db_pass'] === ''
    ) {
        respond(500, ['ok' => false, 'message' => 'Database configuration is incomplete.']);
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $config['users_table'])) {
        respond(500, ['ok' => false, 'message' => 'Configured table name is invalid.']);
    }

    // Derived session table name must fit MySQL's 64-character identifier limit.
    if (strlen($config['users_table']) > 55) {
        respond(500, ['ok' => false, 'message' => 'Configured table name is too long.']);
    }
    $environmentTtl = getenv('BLOBULAR_SESSION_TTL_SECONDS');
    $ttl = $fileConfig['session_ttl_seconds'] ?? ($environmentTtl === false ? 3600 : $environmentTtl);
    $ttl = filter_var($ttl, FILTER_VALIDATE_INT, ['options' => ['min_range' => 60, 'max_range' => 172800]]);
    if ($ttl === false) {
        respond(500, ['ok' => false, 'message' => 'Session lifetime must be 60–172800 seconds.']);
    }
    $config['session_ttl_seconds'] = $ttl;

    return $config;
}

function createPdo(array $config): PDO
{
    try {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=utf8mb4',
            $config['db_host'],
            $config['db_name']
        );

        return new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $exception) {
        respond(500, ['ok' => false, 'message' => 'Database connection failed.']);
    }
}

function ensureUsersTable(PDO $pdo, string $table): void
{
    $createSql = sprintf(
        'CREATE TABLE IF NOT EXISTS `%s` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `username` VARCHAR(64) NOT NULL,
            `password_hash` VARCHAR(255) NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_username` (`username`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        $table
    );

    $pdo->exec($createSql);
}

function normalizedEmailFromPayload(array $payload): string
{
    return strtolower(trim((string) ($payload['email'] ?? $payload['username'] ?? '')));
}

function validateEmail(string $email): void
{
    if ($email === '' || strlen($email) > 64 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(400, ['ok' => false, 'message' => 'Email must be valid.']);
    }
}

function validatePasswordStrength(string $password, string $label = 'Password'): void
{
    if (strlen($password) < 8) {
        respond(400, ['ok' => false, 'message' => sprintf('%s must be at least 8 characters.', $label)]);
    }

    if (!preg_match('/\d/', $password)) {
        respond(400, ['ok' => false, 'message' => sprintf('%s must include at least one number.', $label)]);
    }

    if (!preg_match('/[^a-zA-Z0-9]/', $password)) {
        respond(400, ['ok' => false, 'message' => sprintf('%s must include at least one special character.', $label)]);
    }
}
