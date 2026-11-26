<?php
// Test-only adapter, copied into a disposable docroot. Never deployed under public/.
final class FixtureHttpStore implements AudioObjectStore
{
    private function state(): array {
        $path = __DIR__ . '/objects.json';
        $state = is_file($path) ? json_decode(file_get_contents($path), true) : ['objects' => []];
        if ($state['fail'] ?? false) { throw new ObjectStoreFailure('sensitive fixture storage error'); }
        return $state;
    }
    private function save(array $state): void { file_put_contents(__DIR__ . '/objects.json', json_encode($state)); }
    public function upload(string $key, int $bytes, string $mime, string $checksum, int $expires): array {
        $this->state(); return ['url' => 'https://example.invalid/' . $key, 'method' => 'PUT', 'headers' => []];
    }
    public function inspect(string $key): ?array { return $this->state()['objects'][$key] ?? null; }
    public function publish(string $source, string $destination, string $etag): void {
        $state = $this->state(); $state['objects'][$destination] = $state['objects'][$source]; $this->save($state);
    }
    public function download(string $key, int $expires): string { $this->state(); return 'https://example.invalid/' . $key; }
    public function remove(string $key): void { $state = $this->state(); unset($state['objects'][$key]); $this->save($state); }
}
