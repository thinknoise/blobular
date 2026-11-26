<?php

declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
requirePostMethod();
$config = loadApiConfig();
$pdo = createPdo($config);
try {
    requireAuthSession($pdo, $config);
    revokeAuthSession($pdo, $config, bearerToken($_SERVER));
    respond(200, ['ok' => true, 'message' => 'Logged out.']);
} catch (Throwable $exception) {
    respond(500, ['ok' => false, 'message' => 'Unable to revoke account session.']);
}
