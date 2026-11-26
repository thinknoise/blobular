<?php

declare(strict_types=1);

final class ObjectStoreFailure extends RuntimeException {}

interface AudioObjectStore
{
    public function upload(string $key, int $bytes, string $mime, string $checksum, int $expires): array;
    public function inspect(string $key): ?array;
    public function publish(string $source, string $destination, string $etag): void;
    public function download(string $key, int $expires): string;
    public function remove(string $key): void;
}

function cloudStorageConfig(): array
{
    $key = getenv('BLOBULAR_S3_ACCESS_KEY_ID');
    $secret = getenv('BLOBULAR_S3_SECRET_ACCESS_KEY');
    if ($key === false || $key === '' || $secret === false || $secret === '') {
        throw new ObjectStoreFailure('Cloud storage is not configured.');
    }
    return ['bucket' => 'blobular-audio', 'region' => 'us-east-2', 'key' => $key,
        'secret' => $secret, 'token' => getenv('BLOBULAR_S3_SESSION_TOKEN') ?: ''];
}

// SigV4 query signing; keys are server-generated, and the production host is fixed.
// AWS's published example is exercised by tests/backend/sounds.php.
function s3Presign(array $config, string $host, string $method, string $key, array $headers, int $expires, int $now, array $query = []): string
{
    $date = gmdate('Ymd', $now);
    $timestamp = gmdate('Ymd\THis\Z', $now);
    $scope = "$date/{$config['region']}/s3/aws4_request";
    $headers['host'] = $host;
    ksort($headers, SORT_STRING);
    $canonicalHeaders = '';
    foreach ($headers as $name => $value) {
        if (preg_match('/[\r\n]/', (string) $value)) { throw new ObjectStoreFailure('Invalid signed header.'); }
        $canonicalHeaders .= $name . ':' . trim(preg_replace('/\s+/', ' ', (string) $value)) . "\n";
    }
    $signedHeaders = implode(';', array_keys($headers));
    $query = array_merge($query, ['X-Amz-Algorithm' => 'AWS4-HMAC-SHA256',
        'X-Amz-Credential' => $config['key'] . '/' . $scope, 'X-Amz-Date' => $timestamp,
        'X-Amz-Expires' => (string) $expires, 'X-Amz-SignedHeaders' => $signedHeaders]);
    if ($config['token'] !== '') { $query['X-Amz-Security-Token'] = $config['token']; }
    $encoded = [];
    foreach ($query as $name => $value) { $encoded[rawurlencode($name)] = rawurlencode((string) $value); }
    ksort($encoded, SORT_STRING);
    $pairs = [];
    foreach ($encoded as $name => $value) { $pairs[] = "$name=$value"; }
    $queryString = implode('&', $pairs);
    $path = '/' . implode('/', array_map('rawurlencode', explode('/', $key)));
    $canonical = "$method\n$path\n$queryString\n$canonicalHeaders\n$signedHeaders\nUNSIGNED-PAYLOAD";
    $toSign = "AWS4-HMAC-SHA256\n$timestamp\n$scope\n" . hash('sha256', $canonical);
    $signingKey = 'AWS4' . $config['secret'];
    foreach ([$date, $config['region'], 's3', 'aws4_request'] as $part) {
        $signingKey = hash_hmac('sha256', $part, $signingKey, true);
    }
    return "https://$host$path?$queryString&X-Amz-Signature=" . hash_hmac('sha256', $toSign, $signingKey);
}

final class S3AudioObjectStore implements AudioObjectStore
{
    private array $config;
    private string $host;
    private $transport;

    public function __construct(array $config, ?callable $transport = null)
    {
        $this->config = $config;
        $this->host = $config['bucket'] . '.s3.' . $config['region'] . '.amazonaws.com';
        $this->transport = $transport;
    }

    private function url(string $method, string $key, array $headers, int $expires, array $query = []): string
    {
        return s3Presign($this->config, $this->host, $method, $key, $headers, $expires, time(), $query);
    }

    public function upload(string $key, int $bytes, string $mime, string $checksum, int $expires): array
    {
        $headers = ['content-length' => (string) $bytes, 'content-type' => $mime,
            'x-amz-checksum-sha256' => base64_encode(hex2bin($checksum))];
        return ['url' => $this->url('PUT', $key, $headers, $expires), 'method' => 'PUT', 'headers' => $headers];
    }

    private function request(string $method, string $key, array $headers = []): array
    {
        $url = $this->url($method, $key, $headers, 60);
        if ($this->transport !== null) { return ($this->transport)($method, $url, $headers); }
        $curl = curl_init($url);
        $responseHeaders = [];
        $body = '';
        $wireHeaders = [];
        foreach ($headers as $name => $value) { $wireHeaders[] = "$name: $value"; }
        curl_setopt_array($curl, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_NOBODY => $method === 'HEAD',
            CURLOPT_HTTPHEADER => $wireHeaders, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 30,
            CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$responseHeaders): int {
                if (str_starts_with($line, 'HTTP/')) { $responseHeaders = []; }
                $parts = explode(':', $line, 2);
                if (count($parts) === 2) { $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]); }
                return strlen($line);
            },
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body): int {
                if (strlen($body) + strlen($chunk) > 65536) { return 0; }
                $body .= $chunk;
                return strlen($chunk);
            }]);
        $success = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if ($success === false) { throw new ObjectStoreFailure('Storage request failed.'); }
        return ['status' => $status, 'headers' => $responseHeaders, 'body' => $body];
    }

    public function inspect(string $key): ?array
    {
        $result = $this->request('HEAD', $key, ['x-amz-checksum-mode' => 'ENABLED']);
        if ($result['status'] === 404) { return null; }
        if ($result['status'] !== 200) { throw new ObjectStoreFailure('Unable to inspect upload.', $result['status']); }
        $headers = $result['headers'];
        return ['bytes' => (int) ($headers['content-length'] ?? -1), 'mime' => $headers['content-type'] ?? '',
            'checksum' => $headers['x-amz-checksum-sha256'] ?? '', 'etag' => $headers['etag'] ?? ''];
    }

    public function publish(string $source, string $destination, string $etag): void
    {
        $result = $this->request('PUT', $destination, ['content-length' => '0',
            'x-amz-copy-source' => '/' . $this->config['bucket'] . '/' . implode('/', array_map('rawurlencode', explode('/', $source))),
            'x-amz-copy-source-if-match' => $etag, 'x-amz-checksum-algorithm' => 'SHA256']);
        // CopyObject can return HTTP 200 with an embedded Error. Never publish that.
        $previous = libxml_use_internal_errors(true);
        try {
            $xml = str_contains($result['body'], '<!DOCTYPE') ? false : simplexml_load_string($result['body'], SimpleXMLElement::class, LIBXML_NONET);
            if ($result['status'] !== 200 || $xml === false || $xml->getName() !== 'CopyObjectResult' || (string) $xml->ETag === '') {
                throw new ObjectStoreFailure('Unable to publish upload.');
            }
        } finally { libxml_clear_errors(); libxml_use_internal_errors($previous); }
    }

    public function download(string $key, int $expires): string
    {
        return $this->url('GET', $key, [], $expires, ['response-content-disposition' => 'attachment',
            'response-content-type' => 'application/octet-stream', 'response-cache-control' => 'private, no-store']);
    }

    public function remove(string $key): void
    {
        $result = $this->request('DELETE', $key);
        if (!in_array($result['status'], [204, 404], true)) { throw new ObjectStoreFailure('Unable to remove object.'); }
    }
}
