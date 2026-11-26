<?php

declare(strict_types=1);

return [
    'db_host' => 'your-db-host',
    'db_name' => 'your-db-name',
    'db_user' => 'your-db-user',
    'db_pass' => 'your-db-password',
    'users_table' => 'blobular_users',
    // Absolute lifetime; no automatic extension or refresh token.
    'session_ttl_seconds' => 3600,
    // Cloud settings: environment overrides these values, including empty values.
    // Dedicated test-account IDs only; empty denies upload creation/completion.
    'cloud_test_account_ids' => '',
    's3_access_key_id' => '',
    's3_secret_access_key' => '',
    's3_session_token' => '',
];
