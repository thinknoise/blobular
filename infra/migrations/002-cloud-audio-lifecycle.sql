-- Manual only; apply after 001, before enabling audio API. Replace the table prefix.
-- Existing metadata rows are not exposed automatically; audit/backfill separately.
-- MySQL DDL auto-commits. Back up first. No S3 objects are modified by this SQL.
ALTER TABLE `blobular_users_sounds`
    ADD COLUMN `state` ENUM('uploading','ready','deleting','deleted','expired') NOT NULL DEFAULT 'uploading',
    ADD COLUMN `staging_key` VARBINARY(1024) NULL,
    ADD COLUMN `checksum_sha256` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD COLUMN `upload_expires_at` BIGINT UNSIGNED NULL,
    ADD COLUMN `cleanup_after` BIGINT UNSIGNED NULL,
    ADD KEY `sound_owner_state_id` (`owner_user_id`, `state`, `id`),
    ADD KEY `sound_cleanup` (`cleanup_after`);
