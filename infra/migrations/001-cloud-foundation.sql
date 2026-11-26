-- REVIEW BEFORE APPLYING. No data is migrated or backfilled.
-- Replace every occurrence of blobular_users with the configured users_table,
-- including the derived *_sessions and *_sounds names. Run against the same DB.
-- Existing users table must use InnoDB and id INT UNSIGNED PRIMARY KEY.
-- Apply once, before deploying the new PHP endpoints. MySQL DDL auto-commits.

CREATE TABLE `blobular_users_sessions` (
    `token_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `created_at` BIGINT UNSIGNED NOT NULL,
    `expires_at` BIGINT UNSIGNED NOT NULL,
    `revoked_at` BIGINT UNSIGNED NULL,
    PRIMARY KEY (`token_hash`),
    KEY `session_user` (`user_id`),
    KEY `session_expiry` (`expires_at`),
    FOREIGN KEY (`user_id`) REFERENCES `blobular_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;

-- Foundation only. The future authenticated API must assign owner_user_id from
-- the validated session, generate object keys, and authorize EVERY operation.
-- Legacy S3 key prefixes alone are not evidence of ownership.
CREATE TABLE `blobular_users_sounds` (
    `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `owner_user_id` INT UNSIGNED NOT NULL,
    `storage_bucket` VARCHAR(63) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `storage_key` VARBINARY(1024) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(127) NOT NULL,
    `byte_size` BIGINT UNSIGNED NOT NULL,
    `duration_seconds` DOUBLE NULL,
    `sample_rate` INT UNSIGNED NULL,
    `channel_count` SMALLINT UNSIGNED NULL,
    `source_kind` ENUM('upload', 'recording') NOT NULL,
    `visibility` ENUM('private', 'public') NOT NULL DEFAULT 'private',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `sound_object` (`storage_bucket`, `storage_key`),
    KEY `sound_owner_created` (`owner_user_id`, `created_at`),
    FOREIGN KEY (`owner_user_id`) REFERENCES `blobular_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;
