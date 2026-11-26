<?php

declare(strict_types=1);
require_once __DIR__ . '/_s3.php';

const CLOUD_AUDIO_URL_TTL = 300;
const CLOUD_AUDIO_MAX_BYTES = 536870912; // One bounded single-PUT upload, 512 MiB.

final class AudioApiError extends RuntimeException
{
    public int $status;
    public function __construct(int $status, string $message) { parent::__construct($message); $this->status = $status; }
}

function requireCloudAudioWriteAccess(int $owner): void
{
    $configured = trim(cloudSetting('BLOBULAR_CLOUD_TEST_ACCOUNT_IDS', 'cloud_test_account_ids'));
    $allowed = [];
    if ($configured !== '') {
        foreach (explode(',', $configured) as $entry) {
            $entry = trim($entry);
            // Any malformed entry invalidates the entire list; no wildcard/range.
            if (!preg_match('/^[1-9][0-9]{0,9}$/D', $entry) || (int) $entry > 4294967295) {
                throw new AudioApiError(403, 'Cloud saving is restricted to dedicated test accounts.');
            }
            $allowed[] = $entry;
        }
    }
    if (!in_array((string) $owner, $allowed, true)) {
        throw new AudioApiError(403, 'Cloud saving is restricted to dedicated test accounts.');
    }
}

function audioId($value): string
{
    if (!is_string($value) || !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/D', $value)) {
        throw new AudioApiError(400, 'A valid recording id is required.');
    }
    return $value;
}

function readCloudUploadInput(): array
{
    // This endpoint accepts metadata only; never buffer an uploaded audio body.
    $body = file_get_contents('php://input', false, null, 0, 16385);
    if ($body === false || strlen($body) > 16384) { throw new AudioApiError(413, 'Upload metadata is too large.'); }
    $input = json_decode($body);
    if (!$input instanceof stdClass) { throw new AudioApiError(400, 'A JSON metadata object is required.'); }
    return (array) $input;
}

function newAudioId(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 15) | 64);
    $bytes[8] = chr((ord($bytes[8]) & 63) | 128);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function audioText($value, string $field): string
{
    if (!is_string($value) || $value === '' || strlen($value) > 255 || preg_match('/[\x00-\x1f\x7f]/', $value)) {
        throw new AudioApiError(400, "Invalid $field.");
    }
    return $value;
}

final class CloudAudioLibrary
{
    private PDO $pdo;
    private string $table;
    private AudioObjectStore $storage;

    public function __construct(PDO $pdo, array $config, AudioObjectStore $storage)
    {
        $this->pdo = $pdo;
        $this->table = $config['users_table'] . '_sounds';
        $this->storage = $storage;
    }

    private function owned(int $owner, string $id, bool $lock = false): array
    {
        $suffix = $lock && $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $statement = $this->pdo->prepare("SELECT * FROM `{$this->table}` WHERE id=:id AND owner_user_id=:owner$suffix");
        $statement->execute([':id' => $id, ':owner' => $owner]);
        $row = $statement->fetch();
        if (!$row) { throw new AudioApiError(404, 'Recording not found.'); }
        // Never issue storage capabilities for unreviewed legacy metadata.
        $prefix = 'cloud-library/';
        if ($row['storage_bucket'] !== 'blobular-audio' || $row['storage_key'] !== "{$prefix}saved/$owner/$id"
            || $row['staging_key'] !== "{$prefix}staging/$owner/$id") {
            throw new AudioApiError(409, 'Recording metadata needs migration review.');
        }
        return $row;
    }

    private function metadata(array $row): array
    {
        return ['id' => $row['id'], 'title' => $row['title'], 'filename' => $row['original_filename'],
            'mimeType' => $row['mime_type'], 'byteSize' => (int) $row['byte_size'],
            'checksumSha256' => $row['checksum_sha256'], 'kind' => $row['source_kind'],
            'createdAt' => $row['created_at']];
    }

    public function list(int $owner, ?string $after = null): array
    {
        $statement = $this->pdo->prepare("SELECT * FROM `{$this->table}` WHERE owner_user_id=:owner AND state='ready' AND id>:after ORDER BY id LIMIT 51");
        $statement->execute([':owner' => $owner, ':after' => $after ?? '']);
        $rows = $statement->fetchAll();
        $hasMore = count($rows) > 50;
        $rows = array_slice($rows, 0, 50);
        return ['sounds' => array_map(fn(array $row): array => $this->metadata($row), $rows),
            'nextCursor' => $hasMore ? $rows[49]['id'] : null];
    }

    public function beginUpload(int $owner, array $input, ?int $now = null): array
    {
        requireCloudAudioWriteAccess($owner);
        $now = $now ?? time();
        $filename = audioText($input['filename'] ?? null, 'filename');
        $title = audioText($input['title'] ?? $filename, 'title');
        $mime = $input['mimeType'] ?? null;
        $kind = $input['kind'] ?? 'upload';
        $bytes = $input['byteSize'] ?? null;
        $checksum = $input['checksumSha256'] ?? null;
        if (!is_string($mime) || !in_array($mime, ['audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/x-aiff', 'audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4'], true)
            || !is_string($kind) || !in_array($kind, ['upload', 'recording'], true)
            || !is_int($bytes) || $bytes < 1 || $bytes > CLOUD_AUDIO_MAX_BYTES
            || !is_string($checksum) || !preg_match('/^[a-f0-9]{64}$/D', $checksum)) {
            throw new AudioApiError(400, 'Invalid audio type, size, kind, or SHA-256 checksum.');
        }
        $id = newAudioId();
        $staging = "cloud-library/staging/$owner/$id";
        $saved = "cloud-library/saved/$owner/$id";
        // Generate capability before inserting: configuration/signing failure leaves no row.
        $transfer = $this->storage->upload($staging, $bytes, $mime, $checksum, CLOUD_AUDIO_URL_TTL);
        $statement = $this->pdo->prepare("INSERT INTO `{$this->table}`
            (id,owner_user_id,storage_bucket,storage_key,title,original_filename,mime_type,byte_size,source_kind,visibility,state,staging_key,checksum_sha256,upload_expires_at,cleanup_after)
            VALUES (:id,:owner,'blobular-audio',:saved,:title,:filename,:mime,:bytes,:kind,'private','uploading',:staging,:checksum,:expires,:cleanup)");
        $statement->execute([':id' => $id, ':owner' => $owner, ':saved' => $saved, ':title' => $title,
            ':filename' => $filename, ':mime' => $mime, ':bytes' => $bytes, ':kind' => $kind,
            ':staging' => $staging, ':checksum' => $checksum, ':expires' => $now + CLOUD_AUDIO_URL_TTL,
            ':cleanup' => $now + CLOUD_AUDIO_URL_TTL + 86400]);
        return ['id' => $id, 'state' => 'uploading', 'upload' => $transfer, 'expiresAt' => $now + CLOUD_AUDIO_URL_TTL];
    }

    private function verifyObject(array $row, ?array $object): void
    {
        if ($object === null) { throw new AudioApiError(409, 'Upload is not available yet.'); }
        if ($object['bytes'] !== (int) $row['byte_size'] || $object['mime'] !== $row['mime_type']
            || !hash_equals(base64_encode(hex2bin($row['checksum_sha256'])), $object['checksum'])) {
            throw new AudioApiError(409, 'Uploaded object does not match the declared audio.');
        }
    }

    public function complete(int $owner, string $id, ?int $now = null): array
    {
        requireCloudAudioWriteAccess($owner);
        $now = $now ?? time();
        $this->pdo->beginTransaction();
        try {
            $row = $this->owned($owner, $id, true);
            if ($row['state'] !== 'ready') {
                if ($row['state'] !== 'uploading') { throw new AudioApiError(409, 'Recording is not awaiting upload.'); }
                if ($now >= (int) $row['upload_expires_at'] + 86400) { throw new AudioApiError(410, 'Upload completion window expired.'); }
                try {
                    $object = $this->storage->inspect($row['staging_key']);
                } catch (ObjectStoreFailure $exception) {
                    // Without ListBucket, S3 uses 403 for missing objects too.
                    // This cannot distinguish an unfinished PUT from denied read
                    // access. Keep it unpublished; the caller can retry completion.
                    if ($exception->getCode() === 403) {
                        throw new AudioApiError(409, 'Upload is not available or readable yet.');
                    }
                    throw $exception;
                }
                $this->verifyObject($row, $object);
                $this->storage->publish($row['staging_key'], $row['storage_key'], $object['etag']);
                $this->verifyObject($row, $this->storage->inspect($row['storage_key']));
                $statement = $this->pdo->prepare("UPDATE `{$this->table}` SET state='ready' WHERE id=:id AND owner_user_id=:owner");
                $statement->execute([':id' => $id, ':owner' => $owner]);
            }
            $this->pdo->commit();
            return $this->metadata($row);
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $exception;
        }
    }

    public function download(int $owner, string $id): array
    {
        $row = $this->owned($owner, $id);
        if ($row['state'] !== 'ready') { throw new AudioApiError(409, 'Recording is not saved.'); }
        return ['sound' => $this->metadata($row), 'download' => ['method' => 'GET',
            'url' => $this->storage->download($row['storage_key'], CLOUD_AUDIO_URL_TTL)],
            'expiresAt' => time() + CLOUD_AUDIO_URL_TTL];
    }

    public function delete(int $owner, string $id): void
    {
        $this->pdo->beginTransaction();
        try {
            $row = $this->owned($owner, $id, true);
            $statement = $this->pdo->prepare("UPDATE `{$this->table}` SET state='deleting',cleanup_after=:now WHERE id=:id AND owner_user_id=:owner");
            $statement->execute([':now' => time(), ':id' => $id, ':owner' => $owner]);
            // Hide the row durably before touching S3. A failure remains retryable.
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $exception;
        }
        $this->storage->remove($row['storage_key']);
        $this->storage->remove($row['staging_key']);
        $statement = $this->pdo->prepare("UPDATE `{$this->table}` SET state='deleted',cleanup_after=:later WHERE id=:id AND owner_user_id=:owner AND state='deleting'");
        $statement->execute([':later' => time() + 86400, ':id' => $id, ':owner' => $owner]);
    }

    public function cleanup(bool $apply, ?int $now = null): array
    {
        $now = $now ?? time();
        $statement = $this->pdo->prepare("SELECT id,owner_user_id FROM `{$this->table}` WHERE cleanup_after<=:now ORDER BY cleanup_after,id LIMIT 100");
        $statement->execute([':now' => $now]);
        $candidates = $statement->fetchAll();
        if (!$apply) { return ['candidates' => count($candidates), 'cleaned' => 0, 'failed' => 0]; }
        $cleaned = 0; $failed = 0;
        foreach ($candidates as $candidate) {
            $this->pdo->beginTransaction();
            try {
                $row = $this->owned((int) $candidate['owner_user_id'], $candidate['id'], true);
                if ((int) $row['cleanup_after'] > $now) { $this->pdo->rollBack(); continue; }
                // Tombstones are retained and revisited: a PUT started before URL
                // expiry or a timed-out copy may finish after an earlier cleanup.
                $this->storage->remove($row['staging_key']);
                $state = $row['state'];
                if ($state !== 'ready') {
                    $this->storage->remove($row['storage_key']);
                    $state = $state === 'uploading' ? 'expired' : ($state === 'deleting' ? 'deleted' : $state);
                }
                $update = $this->pdo->prepare("UPDATE `{$this->table}` SET state=:state,cleanup_after=:later WHERE id=:id");
                $update->execute([':state' => $state, ':later' => $now + 86400, ':id' => $row['id']]);
                $this->pdo->commit(); $cleaned++;
            } catch (Throwable $exception) {
                if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); }
                $failed++;
            }
        }
        return ['candidates' => count($candidates), 'cleaned' => $cleaned, 'failed' => $failed];
    }
}

function cloudAudioEndpoint(bool $collection): void
{
    try {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (!in_array($method, $collection ? ['GET', 'POST'] : ['GET', 'POST', 'DELETE'], true)) {
            respond(405, ['ok' => false, 'message' => 'Method not allowed.']);
        }
        $config = loadApiConfig();
        $pdo = createPdo($config);
        $session = requireAuthSession($pdo, $config);
        $owner = (int) $session['id'];
        // Deny writes before storage configuration, signing, parsing or DB mutation.
        if ($method === 'POST') { requireCloudAudioWriteAccess($owner); }
        $library = new CloudAudioLibrary($pdo, $config, new S3AudioObjectStore(cloudStorageConfig()));
        if ($collection) {
            if ($method === 'GET') {
                $cursor = isset($_GET['after']) ? audioId($_GET['after']) : null;
                respond(200, ['ok' => true] + $library->list($owner, $cursor));
            }
            respond(201, ['ok' => true] + $library->beginUpload($owner, readCloudUploadInput()));
        }
        $id = audioId($_GET['id'] ?? null);
        if ($method === 'GET') { respond(200, ['ok' => true] + $library->download($owner, $id)); }
        if ($method === 'POST') { respond(200, ['ok' => true, 'sound' => $library->complete($owner, $id)]); }
        $library->delete($owner, $id);
        respond(200, ['ok' => true]);
    } catch (AudioApiError $exception) {
        respond($exception->status, ['ok' => false, 'message' => $exception->getMessage()]);
    } catch (ObjectStoreFailure $exception) {
        respond(503, ['ok' => false, 'message' => 'Cloud storage unavailable. Retry later.']);
    } catch (Throwable $exception) {
        respond(500, ['ok' => false, 'message' => 'Unable to access cloud library.']);
    }
}
