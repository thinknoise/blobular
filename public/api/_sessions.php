<?php

declare(strict_types=1);

// Only trusted server configuration supplies SQL identifiers.
function sessionsTable(array $config): string
{
    return $config['users_table'] . '_sessions';
}

function issueAuthSession(PDO $pdo, array $config, int $userId, ?int $now = null): array
{
    $now = $now ?? time();
    $token = bin2hex(random_bytes(32));
    $expiresAt = $now + $config['session_ttl_seconds'];
    $statement = $pdo->prepare(sprintf(
        'INSERT INTO `%s` (token_hash, user_id, created_at, expires_at) VALUES (:hash, :user_id, :created_at, :expires_at)',
        sessionsTable($config)
    ));
    $statement->execute([
        ':hash' => hash('sha256', $token), ':user_id' => $userId,
        ':created_at' => $now, ':expires_at' => $expiresAt,
    ]);
    return ['sessionToken' => $token, 'tokenType' => 'Bearer', 'expiresAt' => $expiresAt];
}

function bearerToken(array $server): ?string
{
    $header = $server['HTTP_AUTHORIZATION'] ?? $server['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    // Never accept a token from a query string, cookie, or client-supplied user id.
    if (!is_string($header) || !preg_match('/^Bearer ([a-f0-9]{64})$/iD', $header, $matches)) {
        return null;
    }
    return $matches[1];
}

function findAuthSession(PDO $pdo, array $config, ?string $token, ?int $now = null): ?array
{
    if ($token === null || !preg_match('/^[a-f0-9]{64}$/D', $token)) {
        return null;
    }
    $statement = $pdo->prepare(sprintf(
        'SELECT u.id, u.username, u.created_at, s.expires_at FROM `%s` s
         INNER JOIN `%s` u ON u.id = s.user_id
         WHERE s.token_hash = :hash AND s.revoked_at IS NULL AND s.expires_at > :now',
        sessionsTable($config), $config['users_table']
    ));
    $statement->execute([':hash' => hash('sha256', $token), ':now' => $now ?? time()]);
    $row = $statement->fetch();
    return $row === false ? null : $row;
}

function revokeAuthSession(PDO $pdo, array $config, string $token, ?int $now = null): void
{
    $statement = $pdo->prepare(sprintf(
        'UPDATE `%s` SET revoked_at = :now WHERE token_hash = :hash AND revoked_at IS NULL',
        sessionsTable($config)
    ));
    $statement->execute([':now' => $now ?? time(), ':hash' => hash('sha256', $token)]);
}

function revokeUserSessions(PDO $pdo, array $config, int $userId): void
{
    $statement = $pdo->prepare(sprintf(
        'UPDATE `%s` SET revoked_at = :now WHERE user_id = :user_id AND revoked_at IS NULL',
        sessionsTable($config)
    ));
    $statement->execute([':now' => time(), ':user_id' => $userId]);
}

function loginAccount(PDO $pdo, array $config, string $email, string $password, ?int $now = null): ?array
{
    $pdo->beginTransaction();
    try {
        // Serialize login with password changes so old credentials cannot mint a
        // session after the password-change transaction revokes existing sessions.
        $lock = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $statement = $pdo->prepare(sprintf(
            'SELECT id, password_hash, created_at FROM `%s` WHERE username = :username LIMIT 1%s',
            $config['users_table'], $lock
        ));
        $statement->execute([':username' => $email]);
        $row = $statement->fetch();
        if (!$row || !password_verify($password, (string) $row['password_hash'])) {
            $pdo->rollBack();
            return null;
        }
        $session = issueAuthSession($pdo, $config, (int) $row['id'], $now);
        $pdo->commit();
        return array_merge([
            'ok' => true, 'message' => 'Login successful.',
            'userId' => (int) $row['id'], 'createdAt' => (string) $row['created_at'],
        ], $session);
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) { $pdo->rollBack(); }
        throw $exception;
    }
}

function requireAuthSession(PDO $pdo, array $config): array
{
    $session = findAuthSession($pdo, $config, bearerToken($_SERVER));
    if ($session === null) {
        header('WWW-Authenticate: Bearer');
        respond(401, ['ok' => false, 'message' => 'Authentication required.']);
    }
    return $session;
}
