<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_entitlements.php';

requirePostMethod();
try {
    $raw = file_get_contents('php://input', false, null, 0, 131073);
    $input = json_decode($raw ?: '', true);
    if (strlen($raw ?: '') > 131072 || !is_array($input) || array_keys($input) !== ['signedPayload']
        || !is_string($input['signedPayload']) || strlen($input['signedPayload'])<16) {
        throw new EntitlementError(400, 'A signed Apple notification is required.');
    }
    $config = loadApiConfig();
    // This is not an admin endpoint. Apple's signature and current server status
    // must be verified before any existing account binding may be updated.
    (new SubscriptionEntitlements(createPdo($config), $config))->notification($input['signedPayload']);
    respond(200, ['ok'=>true]);
} catch (EntitlementError $error) {
    respond($error->status, ['ok'=>false, 'message'=>$error->getMessage()]);
} catch (Throwable $error) {
    respond(503, ['ok'=>false, 'message'=>'Notification processing is unavailable.']);
}
