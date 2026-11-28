<?php
declare(strict_types=1);

final class AccountDeletionError extends RuntimeException
{
    public int $status;
    public function __construct(int $status, string $message)
    { parent::__construct($message); $this->status = $status; }
}

function accountDeletionStatus(PDO $pdo, array $config, int $user): ?array
{
    $table = $config['users_table'] . '_ent_log';
    $query = $pdo->prepare("SELECT id, recorded_at FROM `$table`
        WHERE user_id=:user AND action='request-account-deletion' ORDER BY id DESC LIMIT 1");
    $query->execute([':user' => $user]);
    $row = $query->fetch(PDO::FETCH_ASSOC);
    return $row === false ? null : ['id' => (int) $row['id'],
        'status' => 'requested', 'requestedAt' => (int) $row['recorded_at']];
}

/** A durable request, not an erasure operation. No audio, user or billing rows change. */
function requestAccountDeletion(PDO $pdo, array $config, string $token, string $password): array
{
    $session = findAuthSession($pdo, $config, $token);
    if ($session === null) { throw new AccountDeletionError(401, 'Authentication required.'); }
    $user = (int) $session['id'];
    $users = $config['users_table'];
    $sessions = sessionsTable($config);
    $audit = $users . '_ent_log';
    $lock = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
    $pdo->beginTransaction();
    try {
        // Same user-first lock order as login/password changes and audited grants.
        $query = $pdo->prepare("SELECT password_hash FROM `$users` WHERE id=:user" . $lock);
        $query->execute([':user' => $user]);
        $row = $query->fetch(PDO::FETCH_ASSOC);
        if (!$row || !password_verify($password, (string) $row['password_hash'])) {
            throw new AccountDeletionError(403, 'Current password was not accepted.');
        }
        // Recheck expiry/revocation after password verification and hold the session
        // through commit. A stale session cannot submit on behalf of another user.
        $query = $pdo->prepare("SELECT user_id FROM `$sessions` WHERE token_hash=:hash
            AND user_id=:user AND revoked_at IS NULL AND expires_at>:now" . $lock);
        $query->execute([':hash' => hash('sha256', $token), ':user' => $user, ':now' => time()]);
        if ($query->fetch(PDO::FETCH_ASSOC) === false) {
            throw new AccountDeletionError(401, 'Authentication required.');
        }
        $request = accountDeletionStatus($pdo, $config, $user);
        if ($request === null) {
            $now = time();
            $query = $pdo->prepare("INSERT INTO `$audit` (user_id,action,actor,reason,recorded_at)
                VALUES (:user,'request-account-deletion',:actor,:reason,:now)");
            $query->execute([':user' => $user, ':actor' => 'account:' . $user,
                ':reason' => 'Confirmed in-app account and Cloud data deletion request; password verified', ':now' => $now]);
            $request = ['id' => (int) $pdo->lastInsertId(), 'status' => 'requested', 'requestedAt' => $now];
        }
        $pdo->commit();
        return $request;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) { $pdo->rollBack(); }
        throw $error;
    }
}
