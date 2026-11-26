#!/usr/bin/env python3
"""Run MySQL regressions in disposable cached Docker images; never uses real config.
No images are pulled, dependencies installed, or persistent volumes created.
"""
from pathlib import Path
import subprocess
import sys
import time
import uuid


def run(image):
    name = 'blobular-auth-test-' + uuid.uuid4().hex[:12]
    started = False
    try:
        subprocess.run(['docker', 'run', '--detach', '--pull=never', '--name', name,
            '--publish', '127.0.0.1::3306', '--env', 'MYSQL_ALLOW_EMPTY_PASSWORD=yes',
            '--env', 'MYSQL_ROOT_HOST=%', image, '--innodb-default-row-format=COMPACT'],
            check=True, stdout=subprocess.DEVNULL)
        started = True
        for _ in range(150):
            ready = subprocess.run(['docker', 'exec', name, 'mysql', '--protocol=TCP', '-h127.0.0.1', '-uroot',
                '--batch', '--skip-column-names', '-e', 'SELECT 1'],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ready.returncode == 0:
                break
            time.sleep(.2)
        else:
            raise RuntimeError('Disposable MySQL did not become ready')
        endpoint = subprocess.check_output(['docker', 'port', name, '3306'], text=True).strip()
        if not endpoint.startswith('127.0.0.1:'):
            raise RuntimeError('Expected a localhost-only port')
        port = endpoint.rsplit(':', 1)[1]
        print(f'Testing {image}', flush=True)
        subprocess.run(['php', str(Path(__file__).with_suffix('.php')), port], check=True, timeout=45)
    finally:
        if started:
            subprocess.run(['docker', 'rm', '--force', '--volumes', name],
                           check=True, stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    for image in sys.argv[1:] or ['mysql:8.0', 'mysql:8.4']:
        if image not in ('mysql:8.0', 'mysql:8.4'):
            raise SystemExit('Only the cached mysql:8.0 and mysql:8.4 test images are supported')
        run(image)
