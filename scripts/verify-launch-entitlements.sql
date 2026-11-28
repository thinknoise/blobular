-- READ ONLY. Execute in phpMyAdmin; no migration, grant or configuration change.
-- Expect two rows, each MATCH / 1 / 1. Missing/revoked/unaudited grants remain visible.
SELECT expected.id, u.username,
    CASE WHEN CAST(u.username AS BINARY) = CAST(expected.email AS BINARY)
         THEN 'MATCH' ELSE 'MISMATCH' END AS expected_identity,
    (c.user_id IS NOT NULL AND c.revoked_at IS NULL) AS permanent_comp_active,
    c.granted_at, c.revoked_at,
    EXISTS (
        SELECT 1 FROM `modelglue_user`.`blobular_users_ent_log` AS a
        WHERE a.user_id = expected.id
          AND a.action = 'grant-complimentary'
          AND a.recorded_at = c.granted_at
          AND LENGTH(TRIM(a.actor)) > 0 AND LENGTH(TRIM(a.reason)) > 0
    ) AS matching_audit_exists
FROM (
    SELECT 5 AS id, 'dirtytuba@gmail.com' AS email
    UNION ALL
    SELECT 6, 'blobular-api-test-2b7f0ec7d7ff@example.com'
) AS expected
LEFT JOIN `modelglue_user`.`blobular_users` AS u ON u.id = expected.id
LEFT JOIN `modelglue_user`.`blobular_users_comp` AS c ON c.user_id = expected.id
ORDER BY expected.id;
