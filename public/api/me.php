<?php

declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respond(405, ['ok' => false, 'message' => 'Method not allowed.']);
}
$config = loadApiConfig();
$pdo = createPdo($config);
try {
    $session = requireAuthSession($pdo, $config);
    respond(200, ['ok' => true, 'user' => [
        'id' => (int) $session['id'], 'email' => $session['username'],
        'createdAt' => $session['created_at'],
    ], 'expiresAt' => (int) $session['expires_at']]);
} catch (Throwable $exception) {
    respond(500, ['ok' => false, 'message' => 'Unable to validate account session.']);
}
