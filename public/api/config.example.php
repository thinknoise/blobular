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
    // Cloud settings: explicit file values override the environment, including empty values.
    // Dedicated test-account IDs only; empty denies upload creation/completion.
    'cloud_test_account_ids' => '',
    // Keep the existing gate until migration 003, grants and verifier checks pass.
    'cloud_authorization_mode' => 'test-accounts', // then explicitly 'entitlements'
    'apple_environment' => 'Production',
    'apple_product_ids' => '', // Comma-separated App Store Connect product IDs.
    'apple_verifier_url' => '', // Private HTTPS origin, not the public PHP API.
    'apple_verifier_secret' => '', // At least 32 random characters; server only.
    's3_access_key_id' => '',
    's3_secret_access_key' => '',
    's3_session_token' => '',
];
