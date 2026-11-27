-- MANUAL ONLY. Apply after 001 and 002; no production migration hook.
-- Replace every blobular_users prefix with the configured users table (<=45 chars).
-- MySQL 5.7+/InnoDB; DDL auto-commits: back up and inspect partial application.
-- No account privileges are granted by this migration. Use the audited CLI separately.
CREATE TABLE `blobular_users_billing` (
  `user_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `app_account_token` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  `created_at` BIGINT NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `blobular_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;
CREATE TABLE `blobular_users_comp` (
  `user_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `granted_at` BIGINT NOT NULL,
  `revoked_at` BIGINT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `blobular_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;
CREATE TABLE `blobular_users_subs` (
  `environment` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `original_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `transaction_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `product_id` VARCHAR(255) NOT NULL,
  `expires_at` BIGINT NOT NULL,
  `revoked_at` BIGINT NULL,
  `will_renew` TINYINT NOT NULL,
  `status` VARCHAR(16) CHARACTER SET ascii NOT NULL,
  `signed_at` BIGINT NOT NULL,
  `verified_until` BIGINT NOT NULL,
  `snapshot_hash` CHAR(64) CHARACTER SET ascii NOT NULL,
  PRIMARY KEY (`environment`,`original_id`),
  KEY `subscription_owner` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `blobular_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;
CREATE TABLE `blobular_users_iap_log` (
  `event_hash` CHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  `environment` VARCHAR(16) CHARACTER SET ascii NOT NULL,
  `transaction_id` VARCHAR(64) CHARACTER SET ascii NOT NULL,
  `original_id` VARCHAR(64) CHARACTER SET ascii NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `processed_at` BIGINT NOT NULL,
  KEY `iap_transaction` (`environment`,`transaction_id`),
  FOREIGN KEY (`user_id`) REFERENCES `blobular_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;
CREATE TABLE `blobular_users_ent_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `actor` VARCHAR(128) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `recorded_at` BIGINT NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `blobular_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4;
