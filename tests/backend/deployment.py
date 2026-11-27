#!/usr/bin/env python3
"""Server-owned config and deployment checks; disposable fixture credentials only.

Run after npm run build to also validate the actual deployment artifact.
"""
import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ServerConfigTests(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory(prefix="blobular-deploy-config-")
        self.addCleanup(self.work.cleanup)
        self.api = Path(self.work.name)
        for name in ("_bootstrap.php", "_sessions.php", "_s3.php"):
            shutil.copyfile(ROOT / "public/api" / name, self.api / name)
        self.environment = {key: value for key, value in os.environ.items()
                            if not key.startswith("BLOBULAR_")}

    def configure(self, values):
        encoded = base64.b64encode(json.dumps(values).encode()).decode()
        (self.api / "config.php").write_text(
            "<?php return json_decode(base64_decode('" + encoded + "'), true);")

    def php(self, code, environment=None):
        result = subprocess.run(["php", "-r", code, str(self.api)],
            env={**self.environment, **(environment or {})},
            capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def test_database_and_auth_use_host_file_before_environment(self):
        values = dict(db_host="fixture-host", db_name="fixture-db", db_user="fixture-user",
                      db_pass="fixture-password", users_table="fixture_users", session_ttl_seconds=900)
        self.configure(values)
        config = self.php('require $argv[1]."/_bootstrap.php"; echo json_encode(loadApiConfig());',
                          {"BLOBULAR_DB_PASS": "wrong-environment-password", "BLOBULAR_SESSION_TTL_SECONDS": "0"})
        self.assertEqual(config, values)

    def test_s3_file_values_and_optional_token(self):
        secret = "fixture-secret-with-quotes'\\and-newline\n"
        self.configure(dict(s3_access_key_id="fixture-key", s3_secret_access_key=secret,
                            s3_session_token=""))
        config = self.php('require $argv[1]."/_s3.php"; echo json_encode(cloudStorageConfig());',
                          {"BLOBULAR_S3_ACCESS_KEY_ID": "wrong-key", "BLOBULAR_S3_SESSION_TOKEN": "stale-token"})
        self.assertEqual(config, dict(bucket="blobular-audio", region="us-east-2",
                                     key="fixture-key", secret=secret, token=""))

    def test_s3_environment_fallback(self):
        config = self.php('require $argv[1]."/_s3.php"; echo json_encode(cloudStorageConfig());',
            {"BLOBULAR_S3_ACCESS_KEY_ID": "fixture-key", "BLOBULAR_S3_SECRET_ACCESS_KEY": "fixture-secret",
             "BLOBULAR_S3_SESSION_TOKEN": "fixture-token"})
        self.assertEqual(config["token"], "fixture-token")

    def test_invalid_and_explicitly_empty_credentials_fail_closed(self):
        for key in ("", None, 12, ["key"]):
            with self.subTest(key=key):
                self.configure(dict(s3_access_key_id=key, s3_secret_access_key="fixture-secret"))
                self.assertTrue(self.php('require $argv[1]."/_s3.php"; '
                    'try { cloudStorageConfig(); echo "false"; } '
                    'catch (ObjectStoreFailure $error) { echo "true"; }',
                    {"BLOBULAR_S3_ACCESS_KEY_ID": "environment-key"}))

    def test_shared_loader_can_read_host_cloud_test_accounts(self):
        self.configure(dict(cloud_test_account_ids="6"))
        self.assertEqual(self.php('require $argv[1]."/_s3.php"; '
            'echo json_encode(cloudSetting("BLOBULAR_CLOUD_TEST_ACCOUNT_IDS", "cloud_test_account_ids"));',
            {"BLOBULAR_CLOUD_TEST_ACCOUNT_IDS": "7"}), "6")


class DeploymentTests(unittest.TestCase):
    def test_build_excludes_fixture_credentials_before_copying(self):
        with tempfile.TemporaryDirectory(prefix="blobular-build-fixture-") as directory:
            root = Path(directory)
            for name in ("package.json", "vite.config.ts", "index.html", "tsconfig.json"):
                shutil.copyfile(ROOT / name, root / name)
            shutil.copytree(ROOT / "src", root / "src")
            # Never open or copy an actual config or a backup from the checkout.
            def ignore_config(directory, names):
                return [name for name in names if name.lower().startswith(("config.php", ".config.php"))]
            shutil.copytree(ROOT / "public", root / "public", ignore=ignore_config)
            (root / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
            sentinel = "BLOBULAR_PRIVATE_FIXTURE_MUST_NOT_SHIP_17393"
            api = root / "public/api"
            for name in ("config.php", "config.php.bak", ".config.php.swp", "CONFIG.PHP", ".DS_Store"):
                (api / name).write_text(sentinel)
            result = subprocess.run(["npm", "run", "build"], cwd=root, capture_output=True, text=True,
                env={**os.environ, "BLOBULAR_DB_PASS": sentinel, "BLOBULAR_S3_SECRET_ACCESS_KEY": sentinel})
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual((api / "config.php").read_text(), sentinel)
            for output in (root / "dist").rglob("*"):
                if output.is_file():
                    self.assertNotIn(sentinel.encode(), output.read_bytes(), str(output.relative_to(root)))
            for name in ("config.php", "config.php.bak", ".config.php.swp", "CONFIG.PHP", ".DS_Store",
                         "README.md", "config.example.php"):
                self.assertFalse((root / "dist/api" / name).exists(), name)


    def test_workflow_preserves_remote_config(self):
        workflow = (ROOT / ".github/workflows/deploy.yml").read_text()
        self.assertNotIn("secrets.BLOBULAR_", workflow)
        self.assertNotIn("fs.writeFileSync", workflow)
        self.assertNotIn("push:", workflow)
        self.assertIn("dangerous-clean-slate: false", workflow)
        self.assertIn("protocol: ftp", workflow)
        for pattern in ("**/config.php*", "**/.config.php*", "**/.git*", "**/.git*/**", "**/node_modules/**"):
            self.assertIn(pattern, workflow)

    def test_artifact_has_only_runtime_api_files(self):
        api = ROOT / "dist/api"
        self.assertTrue(api.is_dir(), "Run npm run build first")
        expected = {p.relative_to(ROOT / "public/api") for p in (ROOT / "public/api").rglob("*.php")
                    if not p.name.lower().startswith(("config.php", ".config.php"))
                    and p.name != "config.example.php"}
        actual = {p.relative_to(api) for p in api.rglob("*") if p.is_file()}
        self.assertEqual(actual, expected | {Path(".htaccess")})
        for name in ("index.html", "audio/LongHorn.wav", "worklets/recorder.js"):
            self.assertTrue((ROOT / "dist" / name).is_file(), name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
