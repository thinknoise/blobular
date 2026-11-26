<?php
// Manual CLI maintenance only. No scheduler or production job is installed.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
// Shared API configuration helpers exit via respond(); preserve failure for CLI jobs.
register_shutdown_function(static function (): void {
    if (http_response_code() >= 400) { exit(1); }
});
require dirname(__DIR__) . '/public/api/_bootstrap.php';
require dirname(__DIR__) . '/public/api/_sounds.php';
try {
    if (count($argv) > 2 || (isset($argv[1]) && $argv[1] !== '--apply')) {
        fwrite(STDERR, "Usage: php scripts/cleanup-cloud-audio.php [--apply]\n"); exit(1);
    }
    $config = loadApiConfig();
    $library = new CloudAudioLibrary(createPdo($config), $config, new S3AudioObjectStore(cloudStorageConfig()));
    $result = $library->cleanup(($argv[1] ?? '') === '--apply');
    echo json_encode($result) . "\n";
    exit($result['failed'] > 0 ? 1 : 0);
} catch (Throwable $exception) { fwrite(STDERR, "Cloud cleanup failed; inspect configuration/storage privately.\n"); exit(1); }
