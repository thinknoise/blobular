<?php

declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/public/api/_sounds.php';

final class FixtureAudioStore implements AudioObjectStore
{
    public array $objects = [];
    public int $calls = 0;
    public int $copies = 0;
    public bool $fail = false;
    private function touch(): void { $this->calls++; if ($this->fail) { throw new ObjectStoreFailure('fixture failure'); } }
    public function upload(string $key, int $bytes, string $mime, string $checksum, int $expires): array {
        $this->touch(); return ['url' => 'https://example.invalid/' . $key, 'method' => 'PUT', 'headers' => []];
    }
    public function inspect(string $key): ?array { $this->touch(); return $this->objects[$key] ?? null; }
    public function publish(string $source, string $destination, string $etag): void {
        $this->touch(); $this->copies++; $this->objects[$destination] = $this->objects[$source];
    }
    public function download(string $key, int $expires): string { $this->touch(); return 'https://example.invalid/' . $key; }
    public function remove(string $key): void { $this->touch(); unset($this->objects[$key]); }
}

function runAudioLibraryChecks(PDO $pdo, array $config, callable $assert): void
{
    // Synthetic fixture IDs only; inherited by disposable concurrency children.
    putenv('BLOBULAR_CLOUD_TEST_ACCOUNT_IDS=1,2');
    $store = new FixtureAudioStore();
    $library = new CloudAudioLibrary($pdo, $config, $store);
    $table = $config['users_table'] . '_sounds';
    $input = ['filename' => 'test.wav', 'title' => 'Test', 'mimeType' => 'audio/wav',
        'byteSize' => 32, 'checksumSha256' => hash('sha256', 'fixture'), 'owner_user_id' => 2,
        'storage_key' => 'audio-pond/not-allowed', 'visibility' => 'public'];
    $expected = ['bytes' => 32, 'mime' => 'audio/wav', 'checksum' => base64_encode(hash('sha256', 'fixture', true)), 'etag' => '"fixture-etag"'];
    $expectError = static function (callable $operation, int $status, string $description) use ($assert): void {
        try { $operation(); } catch (AudioApiError $error) { $assert($error->status === $status, $description); return; }
        throw new RuntimeException($description);
    };
    putenv('BLOBULAR_CLOUD_TEST_ACCOUNT_IDS=');
    $expectError(fn() => $library->beginUpload(1, $input), 403, 'Service denies upload without allowlist');
    $expectError(fn() => $library->complete(1, '00000000-0000-4000-8000-000000000001'), 403, 'Service denies completion without allowlist');
    $assert($store->calls === 0, 'Denied service writes never reach storage');
    putenv('BLOBULAR_CLOUD_TEST_ACCOUNT_IDS=1,2');
    $headStatus = 403;
    $storageRequests = [];
    $restrictedStore = new S3AudioObjectStore(['bucket'=>'fixture-bucket','region'=>'us-east-2',
        'key'=>'fixture-key','secret'=>'fixture-secret','token'=>''],
        static function ($method, $url, $headers) use (&$headStatus, &$storageRequests): array {
            $storageRequests[] = $method;
            return ['status'=>$headStatus, 'headers'=>[], 'body'=>''];
        });
    $restrictedLibrary = new CloudAudioLibrary($pdo, $config, $restrictedStore);
    $unfinished = $restrictedLibrary->beginUpload(1, $input, 1000);
    $expectError(fn() => $restrictedLibrary->complete(1, $unfinished['id'], 1100), 409,
        'missing staging object without ListBucket returns retryable conflict');
    $assert($storageRequests === ['HEAD'], 'ambiguous staging 403 never copies an object');
    $assert($restrictedLibrary->list(1)['sounds'] === [], 'ambiguous staging 403 keeps metadata hidden');
    $headStatus = 500;
    try { $restrictedLibrary->complete(1, $unfinished['id'], 1100); throw new RuntimeException('storage error expected'); }
    catch (ObjectStoreFailure $error) { $assert($error->getCode() === 500, 'actual storage outage remains a storage failure'); }
    $pending = $library->beginUpload(1, $input, 1000);
    $id = $pending['id']; $stage = "cloud-library/staging/1/$id"; $saved = "cloud-library/saved/1/$id";
    $assert($pending['expiresAt'] === 1300 && str_contains($pending['upload']['url'], $stage), 'upload is short-lived and scoped to server-generated staging key');
    $assert(count($library->list(1)['sounds']) === 0, 'pending upload is hidden');
    $row = $pdo->query("SELECT * FROM `$table` WHERE id='$id'")->fetch();
    $assert((int) $row['owner_user_id'] === 1 && $row['visibility'] === 'private' && $row['storage_key'] === $saved, 'client ownership, key and visibility are ignored');
    $calls = $store->calls;
    foreach (['complete', 'download', 'delete'] as $operation) {
        $expectError(fn() => $library->$operation(2, $id), 404, "$operation rejects another account");
    }
    $assert($calls === $store->calls, 'cross-account attempts never reach storage');
    $expectError(fn() => $library->complete(1, $id, 1100), 409, 'interrupted PUT cannot be published');
    $store->objects[$stage] = $expected; $store->objects[$stage]['bytes'] = 31;
    $expectError(fn() => $library->complete(1, $id, 1100), 409, 'size mismatch cannot be published');
    $store->objects[$stage] = $expected; $store->objects[$stage]['checksum'] = 'wrong';
    $expectError(fn() => $library->complete(1, $id, 1100), 409, 'checksum mismatch cannot be published');
    $store->objects[$stage] = $expected; $store->objects[$stage]['mime'] = 'text/html';
    $expectError(fn() => $library->complete(1, $id, 1100), 409, 'MIME mismatch cannot be published');
    $store->objects[$stage] = $expected;
    $store->fail = true;
    try { $library->complete(1, $id, 1100); throw new RuntimeException('storage error expected'); }
    catch (ObjectStoreFailure $error) {}
    $store->fail = false;
    $assert(count($library->list(1)['sounds']) === 0, 'storage failure leaves upload hidden and retryable');
    $record = $library->complete(1, $id, 1100);
    $assert($record['id'] === $id && count($library->list(1)['sounds']) === 1, 'verified copy becomes saved metadata');
    $copies = $store->copies;
    $library->complete(1, $id, 1101);
    $assert($store->copies === $copies, 'completion retry is idempotent');
    $assert(count($library->list(2)['sounds']) === 0, 'listing is owner-only');
    $assert(str_contains($library->download(1, $id)['download']['url'], $saved), 'download capability points to saved key only');
    $store->fail = true;
    try { $library->delete(1, $id); throw new RuntimeException('storage error expected'); }
    catch (ObjectStoreFailure $error) {}
    $store->fail = false;
    $assert(count($library->list(1)['sounds']) === 0, 'failed delete remains durably hidden');
    $expectError(fn() => $library->download(1, $id), 409, 'deleting object cannot get a new download capability');
    $library->delete(1, $id); $library->delete(1, $id);
    $assert(!isset($store->objects[$saved]), 'delete retry is idempotent');
    // Recreate a late staging object after cancellation; tombstone cleanup revisits it.
    $store->objects[$stage] = $expected;
    $library->cleanup(true, time() + 172800);
    $assert(!isset($store->objects[$stage]), 'tombstone cleanup removes late uploads');
    $abandoned = $library->beginUpload(1, $input, 1000);
    $store->objects['cloud-library/staging/1/' . $abandoned['id']] = $expected;
    $expectError(fn() => $library->complete(1, $abandoned['id'], 87700), 410, 'expired upload cannot complete');
    $before = $store->calls;
    $library->cleanup(false, 90000);
    $assert($before === $store->calls, 'cleanup preview does not touch storage');
    $library->cleanup(true, 90000);
    $assert(!isset($store->objects['cloud-library/staging/1/' . $abandoned['id']]), 'abandoned upload cleanup removes staging data');
    foreach ([['byteSize' => 0], ['byteSize' => CLOUD_AUDIO_MAX_BYTES + 1], ['byteSize' => '32'],
        ['checksumSha256' => 'bad'], ['mimeType' => 'text/html'], ['filename' => "bad\nname"], ['title' => []]] as $invalid) {
        $expectError(fn() => $library->beginUpload(1, array_merge($input, $invalid)), 400, 'invalid upload metadata rejected');
    }
    // Force a DB failure after S3 publication: the row must remain hidden/retryable.
    $interrupted = $library->beginUpload(1, $input, 1000);
    $iid = $interrupted['id']; $store->objects["cloud-library/staging/1/$iid"] = $expected;
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $pdo->exec($driver === 'mysql'
        ? "CREATE TRIGGER fixture_fail_ready BEFORE UPDATE ON `$table` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture failure'"
        : "CREATE TRIGGER fixture_fail_ready BEFORE UPDATE ON `$table` BEGIN SELECT RAISE(ABORT, 'fixture failure'); END");
    try { $library->complete(1, $iid, 1100); throw new RuntimeException('database error expected'); }
    catch (PDOException $error) {} finally { $pdo->exec('DROP TRIGGER fixture_fail_ready'); }
    $assert(count($library->list(1)['sounds']) === 0 && isset($store->objects["cloud-library/saved/1/$iid"]), 'DB failure after copy keeps unpublished object hidden');
    $library->complete(1, $iid, 1101);
    $assert(count($library->list(1)['sounds']) === 1, 'completion recovers after post-copy DB failure');
    // Pagination is stable under the documented UUID ordering.
    for ($i = 0; $i < 51; $i++) {
        $upload = $library->beginUpload(1, $input, 1000);
        $store->objects['cloud-library/staging/1/' . $upload['id']] = $expected;
        $library->complete(1, $upload['id'], 1100);
    }
    $page = $library->list(1); $next = $library->list(1, $page['nextCursor']);
    $ids = array_merge(array_column($page['sounds'], 'id'), array_column($next['sounds'], 'id'));
    $assert(count($page['sounds']) === 50 && count(array_unique($ids)) === 52 && $next['nextCursor'] === null, 'owner listing paginates without duplicate rows');
}

function runS3Checks(callable $assert): void
{
    // AWS documentation's public test credentials, NOT real account credentials.
    $config = ['region' => 'us-east-1', 'bucket' => 'examplebucket', 'key' => 'AKIAIOSFODNN7EXAMPLE',
        'secret' => 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', 'token' => ''];
    $url = s3Presign($config, 'examplebucket.s3.amazonaws.com', 'GET', 'test.txt', [], 86400, strtotime('2013-05-24T00:00:00Z'));
    $assert(str_ends_with($url, 'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'), 'SigV4 matches AWS published test vector');
    $config['token'] = 'temporary/token+test=';
    $url = s3Presign($config, 'examplebucket.s3.us-east-1.amazonaws.com', 'PUT', 'a b/+test.wav', ['content-type' => 'audio/wav'], 300, 1700000000);
    $assert(str_contains($url, '/a%20b/%2Btest.wav?') && str_contains($url, 'X-Amz-Security-Token=temporary%2Ftoken%2Btest%3D'), 'SigV4 encodes paths and session credentials');
    $requests = [];
    $response = ['status' => 200, 'headers' => [], 'body' => '<CopyObjectResult><ETag>"copied"</ETag></CopyObjectResult>'];
    $store = new S3AudioObjectStore($config, static function ($method, $url, $headers) use (&$response, &$requests): array {
        $requests[] = [$method, $url, $headers]; return $response;
    });
    $upload = $store->upload('staging/test', 32, 'audio/wav', hash('sha256', 'fixture'), 300);
    parse_str(parse_url($upload['url'], PHP_URL_QUERY), $query);
    $assert($query['X-Amz-SignedHeaders'] === 'content-length;content-type;host;x-amz-checksum-sha256' && $query['X-Amz-Expires'] === '300', 'upload signs size, MIME and checksum with five-minute TTL');
    $store->publish('staging/test', 'saved/test', '"etag"');
    $assert($requests[0][2]['x-amz-copy-source-if-match'] === '"etag"', 'copy is conditional on inspected source ETag');
    foreach ([['status' => 200, 'body' => '<Error><Code>SlowDown</Code></Error>'], ['status' => 200, 'body' => 'invalid XML'], ['status' => 403, 'body' => '<Error/>']] as $failure) {
        $response = $failure + ['headers' => []];
        try { $store->publish('staging/test', 'saved/test', '"etag"'); throw new RuntimeException('copy error expected'); }
        catch (ObjectStoreFailure $error) { $assert(true, 'copy failure or embedded error rejected'); }
    }
    $response = ['status' => 404, 'headers' => [], 'body' => ''];
    $assert($store->inspect('missing') === null, 'missing S3 object is not treated as complete');
    $response['status'] = 403;
    try { $store->remove('key'); throw new RuntimeException('delete error expected'); }
    catch (ObjectStoreFailure $error) { $assert(true, 'S3 delete denial is retryable error'); }
    $download = $store->download('saved/test', 300);
    $assert(str_contains($download, 'response-content-type=application%2Foctet-stream') && str_contains($download, 'response-content-disposition=attachment'), 'download is forced to non-executable attachment');
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $pdo->exec("CREATE TABLE fixture_users_sounds (id TEXT PRIMARY KEY,owner_user_id INTEGER,storage_bucket TEXT,storage_key TEXT,title TEXT,original_filename TEXT,mime_type TEXT,byte_size INTEGER,source_kind TEXT,visibility TEXT,state TEXT,staging_key TEXT,checksum_sha256 TEXT,upload_expires_at INTEGER,cleanup_after INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
    $count = 0;
    $assert = static function (bool $ok, string $message) use (&$count): void {
        if (!$ok) { throw new RuntimeException($message); } $count++; echo "PASS $message\n";
    };
    runAudioLibraryChecks($pdo, ['users_table' => 'fixture_users'], $assert);
    runS3Checks($assert);
    echo "$count audio/storage checks passed\n";
}
