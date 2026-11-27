<?php
declare(strict_types=1);
require_once __DIR__ . '/_s3.php';

final class EntitlementError extends RuntimeException
{
    public int $status;
    public function __construct(int $status, string $message) { parent::__construct($message); $this->status = $status; }
}

function cloudAuthorizationMode(): string
{
    $mode = cloudSetting('BLOBULAR_CLOUD_AUTHORIZATION_MODE', 'cloud_authorization_mode');
    if ($mode === '' || $mode === 'test-accounts') { return 'test-accounts'; }
    if ($mode !== 'entitlements') { throw new EntitlementError(503, 'Cloud authorization is not configured.'); }
    return $mode;
}

interface AppleSubscriptionVerifier
{
    // Implementations return only independently verified, current Apple facts.
    public function transaction(string $id, string $accountToken): array;
    public function notification(string $signedPayload): array;
}

final class RemoteAppleSubscriptionVerifier implements AppleSubscriptionVerifier
{
    private function request(string $operation, array $payload): array
    {
        $url = cloudSetting('BLOBULAR_APPLE_VERIFIER_URL', 'apple_verifier_url');
        $secret = cloudSetting('BLOBULAR_APPLE_VERIFIER_SECRET', 'apple_verifier_secret');
        $parts = parse_url($url);
        if (!$parts || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
            || strlen($secret) < 32 || preg_match('/[\r\n]/', $secret)) {
            throw new EntitlementError(503, 'Apple verification is not configured.');
        }
        $curl = curl_init(rtrim($url, '/') . '/' . $operation);
        $body = '';
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $secret],
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 30,
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body): int {
                if (strlen($body) + strlen($chunk) > 131072) { return 0; }
                $body .= $chunk; return strlen($chunk);
            }]);
        $success = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        $result = json_decode($body, true);
        if ($success !== false && $status === 400) { throw new EntitlementError(400, 'Apple purchase verification failed.'); }
        if ($success === false || $status !== 200 || !is_array($result) || ($result['verified'] ?? false) !== true
            || !isset($result['snapshots']) || !is_array($result['snapshots']) || count($result['snapshots']) > 20) {
            throw new EntitlementError(503, 'Apple verification is unavailable.');
        }
        return $result['snapshots'];
    }
    public function transaction(string $id, string $accountToken): array
    { return $this->request('transaction', ['transactionId' => $id, 'appAccountToken' => $accountToken]); }
    public function notification(string $signedPayload): array
    { return $this->request('notification', ['signedPayload' => $signedPayload]); }
}

final class SubscriptionEntitlements
{
    private PDO $pdo;
    private string $users;
    private AppleSubscriptionVerifier $apple;
    private string $environment;
    public function __construct(PDO $pdo, array $config, ?AppleSubscriptionVerifier $apple = null)
    {
        $this->users = $config['users_table'];
        if (!preg_match('/^[A-Za-z0-9_]{1,45}$/D', $this->users)) {
            throw new EntitlementError(503, 'Entitlement table prefix is invalid.');
        }
        $this->pdo = $pdo;
        $this->apple = $apple ?? new RemoteAppleSubscriptionVerifier();
        $this->environment = cloudSetting('BLOBULAR_APPLE_ENVIRONMENT', 'apple_environment') ?: 'Production';
        if (!in_array($this->environment, ['Production', 'Sandbox'], true)) {
            throw new EntitlementError(503, 'Apple environment is invalid.');
        }
    }
    private function lock(): string { return $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : ''; }
    private function user(int $user, ?string $email = null): array
    {
        $query = $this->pdo->prepare("SELECT id,username FROM `{$this->users}` WHERE id=:id" . $this->lock());
        $query->execute([':id' => $user]); $row = $query->fetch(PDO::FETCH_ASSOC);
        if (!$row || ($email !== null && $row['username'] !== $email)) {
            throw new EntitlementError(409, 'Account identity did not match.');
        }
        return $row;
    }
    public function accountToken(int $user): string
    {
        $this->pdo->beginTransaction();
        try {
            $this->user($user);
            $query = $this->pdo->prepare("SELECT app_account_token FROM `{$this->users}_billing` WHERE user_id=:id");
            $query->execute([':id' => $user]); $token = $query->fetchColumn();
            if ($token === false) {
                $bytes = random_bytes(16); $bytes[6] = chr((ord($bytes[6]) & 15) | 64); $bytes[8] = chr((ord($bytes[8]) & 63) | 128);
                $hex = bin2hex($bytes);
                $token = substr($hex,0,8).'-'.substr($hex,8,4).'-'.substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20);
                $query = $this->pdo->prepare("INSERT INTO `{$this->users}_billing` (user_id,app_account_token,created_at) VALUES (:id,:token,:now)");
                $query->execute([':id'=>$user, ':token'=>$token, ':now'=>time()]);
            }
            $this->pdo->commit(); return $token;
        } catch (Throwable $error) { if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); } throw $error; }
    }
    public function complimentary(int $user, string $expectedEmail, bool $grant, string $actor, string $reason, ?int $now = null): void
    {
        $this->complimentaryAccounts([['id'=>$user,'email'=>$expectedEmail]], $grant, $actor, $reason, $now);
    }
    public function complimentaryAccounts(array $accounts, bool $grant, string $actor, string $reason, ?int $now = null): void
    {
        if (count($accounts) === 0 || count($accounts) > 100) { throw new EntitlementError(400, 'Accounts are required.'); }
        foreach ($accounts as $account) {
            if (!is_array($account) || !is_int($account['id'] ?? null) || $account['id'] < 1 || !is_string($account['email'] ?? null)) {
                throw new EntitlementError(400, 'Account identities are required.');
            }
        }
        usort($accounts, static fn(array $a, array $b): int => $a['id'] <=> $b['id']);
        if ($actor === '' || strlen($actor)>128 || $reason === '' || strlen($reason)>255
            || preg_match('/[\x00-\x1f\x7f]/', $actor.$reason)) {
            throw new EntitlementError(400, 'An audit actor and reason are required.');
        }
        $now = $now ?? time();
        $this->pdo->beginTransaction();
        try {
            // Lock and verify every identity before changing any entitlement.
            foreach ($accounts as $account) { $this->user($account['id'], $account['email']); }
            foreach ($accounts as $account) {
                $user = $account['id'];
                $query = $this->pdo->prepare("SELECT revoked_at FROM `{$this->users}_comp` WHERE user_id=:id");
                $query->execute([':id'=>$user]); $row = $query->fetch(PDO::FETCH_ASSOC);
                if ($row === false && $grant) {
                    $query = $this->pdo->prepare("INSERT INTO `{$this->users}_comp` (user_id,granted_at,revoked_at) VALUES (:id,:now,NULL)");
                    $query->execute([':id'=>$user, ':now'=>$now]);
                } elseif ($row !== false) {
                    $query = $this->pdo->prepare("UPDATE `{$this->users}_comp` SET granted_at=COALESCE(:granted,granted_at),revoked_at=:revoked WHERE user_id=:id");
                    $query->execute([':id'=>$user, ':granted'=>$grant ? $now : null, ':revoked'=>$grant ? null : $now]);
                } else { throw new EntitlementError(409, 'No complimentary grant exists.'); }
                $query = $this->pdo->prepare("INSERT INTO `{$this->users}_ent_log` (user_id,action,actor,reason,recorded_at) VALUES (:id,:action,:actor,:reason,:now)");
                $query->execute([':id'=>$user, ':action'=>$grant?'grant-complimentary':'revoke-complimentary', ':actor'=>$actor, ':reason'=>$reason, ':now'=>$now]);
            }
            $this->pdo->commit();
        } catch (Throwable $error) { if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); } throw $error; }
    }
    private function snapshot(array $value, string $accountToken, int $now): array
    {
        foreach (['originalId','transactionId','productId','environment','appAccountToken','status'] as $key) {
            if (!isset($value[$key]) || !is_string($value[$key])) { throw new EntitlementError(503, 'Invalid Apple verification result.'); }
        }
        $products = array_filter(array_map('trim', explode(',', cloudSetting('BLOBULAR_APPLE_PRODUCT_IDS', 'apple_product_ids'))));
        if (!preg_match('/^[0-9]{1,64}$/D', $value['originalId']) || !preg_match('/^[0-9]{1,64}$/D', $value['transactionId'])
            || $value['environment'] !== $this->environment || !in_array($value['productId'], $products, true)
            || !hash_equals($accountToken, strtolower($value['appAccountToken']))
            || !in_array($value['status'], ['active','expired','revoked','billing_retry','grace'], true)
            || !isset($value['expiresAt'],$value['signedAt'],$value['willRenew'])
            || !is_int($value['expiresAt']) || $value['expiresAt']<0 || !is_int($value['signedAt']) || $value['signedAt']<1
            || $value['signedAt']>($now+300)*1000 || !is_bool($value['willRenew'])
            || !array_key_exists('revokedAt',$value) || ($value['revokedAt'] !== null && (!is_int($value['revokedAt']) || $value['revokedAt']<0))) {
            throw new EntitlementError(409, 'Apple purchase does not match this account or application.');
        }
        // Stable ordering makes event replay idempotent, independent of JSON key order.
        $keys = ['originalId','transactionId','productId','environment','appAccountToken','status','expiresAt','signedAt','willRenew','revokedAt'];
        $clean = []; foreach ($keys as $key) { $clean[$key] = $value[$key]; }
        $clean['appAccountToken'] = strtolower($clean['appAccountToken']); return $clean;
    }
    private function apply(int $user, array $raw, string $token, int $now, bool $alreadyBound = false): void
    {
        $value = $this->snapshot($raw, $token, $now);
        $digest = hash('sha256', json_encode($value, JSON_THROW_ON_ERROR));
        $this->pdo->beginTransaction();
        try {
            $this->user($user);
            $query = $this->pdo->prepare("SELECT * FROM `{$this->users}_subs` WHERE environment=:env AND original_id=:original" . $this->lock());
            $query->execute([':env'=>$value['environment'], ':original'=>$value['originalId']]); $old = $query->fetch(PDO::FETCH_ASSOC);
            if ($old && (int)$old['user_id'] !== $user) { throw new EntitlementError(409, 'Purchase is already bound to another account.'); }
            if (!$old && $alreadyBound) { $this->pdo->commit(); return; }
            if ($old && (int)$old['signed_at'] > $value['signedAt']) { $this->pdo->commit(); return; }
            if ($old && (int)$old['signed_at'] === $value['signedAt'] && $old['snapshot_hash'] !== $digest) {
                throw new EntitlementError(409, 'Conflicting Apple verification results.');
            }
            $params = [':env'=>$value['environment'], ':original'=>$value['originalId'], ':user'=>$user,
                ':transaction'=>$value['transactionId'], ':product'=>$value['productId'], ':expires'=>$value['expiresAt'],
                ':revoked'=>$value['revokedAt'], ':renew'=>$value['willRenew']?1:0, ':status'=>$value['status'],
                ':signed'=>$value['signedAt'], ':verified'=>$now+300, ':hash'=>$digest];
            if ($old) {
                $sql = "UPDATE `{$this->users}_subs` SET user_id=:user,transaction_id=:transaction,product_id=:product,expires_at=:expires,revoked_at=:revoked,will_renew=:renew,status=:status,signed_at=:signed,verified_until=:verified,snapshot_hash=:hash WHERE environment=:env AND original_id=:original";
            } else {
                $sql = "INSERT INTO `{$this->users}_subs` (environment,original_id,user_id,transaction_id,product_id,expires_at,revoked_at,will_renew,status,signed_at,verified_until,snapshot_hash) VALUES (:env,:original,:user,:transaction,:product,:expires,:revoked,:renew,:status,:signed,:verified,:hash)";
            }
            $this->pdo->prepare($sql)->execute($params);
            $query = $this->pdo->prepare("SELECT event_hash FROM `{$this->users}_iap_log` WHERE event_hash=:hash");
            $query->execute([':hash'=>$digest]);
            if ($query->fetchColumn() === false) {
                $query = $this->pdo->prepare("INSERT INTO `{$this->users}_iap_log` (event_hash,environment,transaction_id,original_id,user_id,processed_at) VALUES (:hash,:env,:transaction,:original,:user,:now)");
                $query->execute([':hash'=>$digest, ':env'=>$value['environment'], ':transaction'=>$value['transactionId'], ':original'=>$value['originalId'], ':user'=>$user, ':now'=>$now]);
            }
            $this->pdo->commit();
        } catch (Throwable $error) { if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); } throw $error; }
    }
    public function restore(int $user, string $transaction, ?int $now = null): void
    {
        if (!preg_match('/^[0-9]{1,64}$/D', $transaction)) { throw new EntitlementError(400, 'A transaction ID is required.'); }
        $token = $this->accountToken($user); $facts = $this->apple->transaction($transaction, $token);
        if (count($facts) !== 1) { throw new EntitlementError(503, 'Invalid Apple verification result.'); }
        $this->apply($user, $facts[0], $token, $now ?? time());
    }
    public function notification(string $signed): void
    {
        foreach ($this->apple->notification($signed) as $raw) {
            if (!is_array($raw) || !is_string($raw['originalId'] ?? null) || !is_string($raw['environment'] ?? null)) {
                throw new EntitlementError(503, 'Invalid Apple verification result.');
            }
            $query = $this->pdo->prepare("SELECT s.user_id,b.app_account_token FROM `{$this->users}_subs` s JOIN `{$this->users}_billing` b ON b.user_id=s.user_id WHERE s.original_id=:id AND s.environment=:env");
            $query->execute([':id'=>$raw['originalId'], ':env'=>$raw['environment']]); $row = $query->fetch(PDO::FETCH_ASSOC);
            // Notifications may update existing bindings, never assign a purchase to a new user.
            if ($row) { $this->apply((int)$row['user_id'], $raw, $row['app_account_token'], time(), true); }
        }
    }
    public function status(int $user, bool $refresh = true, ?int $now = null): array
    {
        $liveClock = $now === null;
        $now = $now ?? time();
        $refreshError = null;
        $query = $this->pdo->prepare("SELECT granted_at FROM `{$this->users}_comp` WHERE user_id=:id AND revoked_at IS NULL");
        $query->execute([':id'=>$user]); $comp = $query->fetchColumn() !== false;
        $query = $this->pdo->prepare("SELECT * FROM `{$this->users}_subs` WHERE user_id=:id AND environment=:env");
        $query->execute([':id'=>$user, ':env'=>$this->environment]); $rows = $query->fetchAll(PDO::FETCH_ASSOC);
        if ($refresh && !$comp) {
            foreach ($rows as $row) {
                if ((int)$row['verified_until'] <= $now) {
                    try { $this->restore($user, $row['transaction_id'], $now); }
                    catch (EntitlementError $error) { $refreshError = $error; }
                }
            }
            $query->execute([':id'=>$user, ':env'=>$this->environment]); $rows = $query->fetchAll(PDO::FETCH_ASSOC);
        }
        // Verification can cross an expiry boundary; authorize at the current time.
        if ($liveClock) { $now = time(); }
        $sources = $comp ? ['complimentary'] : []; $expires = 0; $renew = false;
        foreach ($rows as $row) {
            if ($row['revoked_at'] === null && in_array($row['status'], ['active','grace'], true)
                && (int)$row['expires_at']>$now && (int)$row['verified_until']>$now) {
                if (!in_array('apple',$sources,true)) { $sources[]='apple'; }
                $expires=max($expires,(int)$row['expires_at']); $renew=$renew || (bool)$row['will_renew'];
            }
        }
        // A failed old purchase cannot veto independent, freshly proven access.
        if (count($sources) === 0 && $refreshError !== null) { throw $refreshError; }
        return ['active'=>count($sources)>0, 'sources'=>$sources, 'expiresAt'=>$comp?null:($expires?:null), 'willRenew'=>$renew];
    }
    public function requireSubscriber(int $user, ?int $now = null, bool $refresh = true): void
    {
        if (!$this->status($user, $refresh, $now)['active']) { throw new EntitlementError(403, 'An active Cloud subscription is required to save.'); }
    }
}
