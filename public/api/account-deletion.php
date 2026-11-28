<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_account_deletion.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'POST'], true)) {
        respond(405, ['ok' => false, 'message' => 'Method not allowed.']);
    }
    $config = loadApiConfig();
    $pdo = createPdo($config);
    $session = requireAuthSession($pdo, $config);
    $user = (int) $session['id'];
    if ($method === 'POST') {
        $raw = file_get_contents('php://input', false, null, 0, 16385);
        $input = json_decode($raw ?: '', true);
        if (strlen($raw ?: '') > 16384 || !is_array($input) || count($input) !== 2
            || !isset($input['currentPassword'], $input['confirmation'])
            || !is_string($input['currentPassword']) || $input['currentPassword'] === ''
            || $input['confirmation'] !== 'DELETE ACCOUNT') {
            throw new AccountDeletionError(400, 'Current password and explicit confirmation are required.');
        }
        $request = requestAccountDeletion($pdo, $config, bearerToken($_SERVER), $input['currentPassword']);
    } else {
        $request = accountDeletionStatus($pdo, $config, $user);
    }
    respond(200, ['ok' => true, 'userId' => $user, 'request' => $request]);
} catch (AccountDeletionError $error) {
    respond($error->status, ['ok' => false, 'message' => $error->getMessage()]);
} catch (Throwable $error) {
    respond(503, ['ok' => false, 'message' => 'Account deletion requests are unavailable. Nothing was deleted.']);
}
