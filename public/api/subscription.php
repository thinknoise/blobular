<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_entitlements.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET','POST'], true)) { respond(405, ['ok'=>false, 'message'=>'Method not allowed.']); }
    $config = loadApiConfig(); $pdo = createPdo($config);
    $session = requireAuthSession($pdo, $config); $user = (int)$session['id'];
    $service = new SubscriptionEntitlements($pdo, $config);
    if ($method === 'POST') {
        $raw = file_get_contents('php://input', false, null, 0, 16385);
        $input = json_decode($raw ?: '', true);
        if (strlen($raw ?: '') > 16384 || !is_array($input) || array_keys($input) !== ['transactionId'] || !is_string($input['transactionId'])) {
            throw new EntitlementError(400, 'Only a transactionId is accepted.');
        }
        // Purchase and restoration use the same independently verified, idempotent path.
        $service->restore($user, $input['transactionId']);
    }
    respond(200, ['ok'=>true, 'subscription'=>$service->status($user),
        'appAccountToken'=>$service->accountToken($user), 'authorizationMode'=>cloudAuthorizationMode()]);
} catch (EntitlementError $error) {
    respond($error->status, ['ok'=>false, 'message'=>$error->getMessage()]);
} catch (Throwable $error) {
    respond(503, ['ok'=>false, 'message'=>'Subscription verification is unavailable.']);
}
