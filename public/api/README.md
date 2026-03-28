# Blobular Auth API

These PHP endpoints mirror the Modelglue/Fabrick8r account flow for Blobular:

- `login-user.php`
- `create-user.php`
- `reset-password.php`

They are meant to be deployed with Blobular under `/blobular/api/`.

## Config

Create `config.php` next to these files, based on `config.example.php`, and
fill in the real database credentials. That file is ignored by git.

For GitHub Actions deploys, Blobular also supports generating `config.php`
into `dist/api/` from repository secrets at build time. If
`BLOBULAR_USERS_TABLE` is omitted there, the generated config leaves that key
out and the PHP API fallback is used.

You can also provide these values through server environment variables:

- `BLOBULAR_DB_HOST`
- `BLOBULAR_DB_NAME`
- `BLOBULAR_DB_USER`
- `BLOBULAR_DB_PASS`
- `BLOBULAR_USERS_TABLE`

## Notes

- The user table will be created automatically if it does not exist.
- Passwords are stored with PHP `password_hash()`.
- Blobular stores only a browser-side session flag after login. There is still
  no server-issued session token in this branch.
