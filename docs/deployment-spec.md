# Wuzzanext on the home server: deployment spec

For Tokenmaxximus "Production deployments" on the home server, carried out with Windows
consent, and for the owner, who checks it. It describes what the host should end up with; it
holds no hostnames, addresses or secret values. Every `<...>` is filled in on the host and
stays there.

| Placeholder | What it is |
| --- | --- |
| `<FULL_HASH>` | the reviewed, merged commit being deployed (40 characters) |
| `<PUBLIC_URL>` | the HTTPS address Nginx Proxy Manager serves the app at |
| `<BIND_ADDRESS>` | the address Wuzzanext listens on (see "Bind address") |
| `<DOCKER_SUBNET>` | the network the Docker containers reach the host from (only for option B) |
| `<HOST_LAN_ADDRESS>` | the host's address on the home network (only for the checks) |
| `<NPM_CONTAINER>` | the Nginx Proxy Manager container's name |
| `<BACKUP_DIR>` | where the nightly copies go; best on a second disk |
| `<OWNER_ACCOUNT>` | the owner's own (standard) Windows account on the host |

## 1. The package

Built on the dev machine from `<FULL_HASH>` with `node scripts/build-server.mjs`, in a folder
`wuzzanext-<first 12 characters of the hash>`:

| File | Goes to |
| --- | --- |
| `wuzzanext.exe` | `C:\Wuzzanext\app\wuzzanext.exe` |
| `wuzzanext-source.tar.gz` | `C:\Wuzzanext\app\` (also inside the program; the AGPL source) |
| `selfhosted.yaml.template` | first install only: `C:\Wuzzanext\app\config\selfhosted.yaml` |
| `deployment-spec.md`, `owner-guide.md` | this spec and the owner's steps (not installed) |
| `SHA256SUMS.txt` | the SHA-256 of every file above |

The owner copies the folder to `C:\Wuzzanext\incoming\` and checks the SHA-256s against the
build report for `<FULL_HASH>` (owner guide, step 2). Install nothing whose SHA-256 differs.

## 2. Folders and their permissions

Inheritance from `C:\` is turned off on `C:\Wuzzanext`, so the general Users and
Authenticated Users entries do not apply.

| Folder | Administrators, SYSTEM | `NT SERVICE\Wuzzanext` | `<OWNER_ACCOUNT>` |
| --- | --- | --- | --- |
| `C:\Wuzzanext\app` (program, `config\`) | Full control | Read and execute | none |
| `C:\Wuzzanext\data` (database) | Full control | Modify | none |
| `C:\Wuzzanext\data\uploads` (pictures) | inherited | inherited | none |
| `C:\Wuzzanext\data\logs` | inherited | inherited | Read |
| `C:\Wuzzanext\data\downloads` (the signed APK) | inherited | inherited | Modify |
| `C:\Wuzzanext\incoming` (packages from the owner) | Full control | none | Modify |
| `<BACKUP_DIR>` | Full control | none | none |

The database file is `C:\Wuzzanext\data\wuzzanext.db`; the server creates it on first start.
Its `-wal` and `-shm` files belong to it and stay in the same folder.

## 3. The service

| Setting | Value |
| --- | --- |
| Name and display name | `Wuzzanext` |
| Program | `C:\Wuzzanext\app\wuzzanext.exe`, no arguments |
| Account | the virtual account `NT SERVICE\Wuzzanext` (no password) |
| Start | Automatic |
| Recovery | restart the service after 1 minute on the first, second and later failures; reset the failure count after 1 day |
| Recovery for stops with errors | on ("Enable actions for stops with errors"), because a bad configuration ends the service with exit code 1 or 2 rather than a crash |

Started by Windows, the program works from its own folder (so it reads
`C:\Wuzzanext\app\config\selfhosted.yaml`), writes everything it prints to `DT_LOG_FILE`
(a log over 20 MB is renamed to `.old` at the next start), and stops cleanly on Stop and on
Shutdown.

### Environment variables of the service

Set on the service only (its own `Environment` setting), not system-wide, so no other program
inherits them.

| Name | Value |
| --- | --- |
| `DT_ENV` | `selfhosted` |
| `DT_SQLITE_PATH` | `C:\Wuzzanext\data\wuzzanext.db` |
| `DT_LOG_FILE` | `C:\Wuzzanext\data\logs\wuzzanext.log` |
| `DT_JWT_SECRET` | a new random secret of 64 hex characters, made on the host; it never leaves it |
| `DT_TRANSLATION_ENABLED` | `true`, once the owner has a Google key (`docs/translation-setup.md`) |
| `DT_TRANSLATION_API_KEY` | the owner's Google Cloud Translation key, typed in on the host |

Local accounts on a Windows host can read service settings. If the host has accounts other than
the owner's and the administrators, put the two secrets in `config\selfhosted.yaml` instead
(`jwt.secret`, `translation.api_key`) and remove Read and execute for everyone but
`NT SERVICE\Wuzzanext`, Administrators and SYSTEM on that one file.

### The configuration file

First install only: copy `selfhosted.yaml.template` to
`C:\Wuzzanext\app\config\selfhosted.yaml` and replace `<PUBLIC_URL>` (three places) and
`<BIND_ADDRESS>`. Updates never replace this file.

## 4. Bind address

Nginx Proxy Manager runs in Docker on this same host. Wuzzanext must answer the NPM container
and nothing else. Whether the container can reach a program that listens on `127.0.0.1`
depends on how Docker is set up on this host, so it is tested here, not assumed. Never use an
empty `server.host`, `0.0.0.0` or `<HOST_LAN_ADDRESS>`.

1. **Option A (first choice): `server.host: "127.0.0.1"`.** Start the service, then run the NPM
   check (below) against `http://host.docker.internal:2021`. Want `200`. Firewall rule for A:
   one inbound rule, **Wuzzanext: block port 2021**, Block, TCP, local port 2021, all profiles,
   any remote address. Run the NPM check again after adding it. Want `200` still; if it now
   fails, Docker reaches the host through a network rather than through loopback: remove the
   rule and use option B.
2. **Option B: the host's own address on the network the containers come from.** Find what
   `host.docker.internal` resolves to inside the container
   (`docker exec <NPM_CONTAINER> getent hosts host.docker.internal`) and the host adapter that
   owns the gateway of that network. Set `server.host` to that adapter's address and
   `<DOCKER_SUBNET>` to its network. Firewall rule for B: one inbound rule,
   **Wuzzanext: Docker to port 2021**, Allow, TCP, local port 2021, program
   `C:\Wuzzanext\app\wuzzanext.exe`, remote address `<DOCKER_SUBNET>` only, all profiles. No
   other rule may allow port 2021 or this program (check the inbound rules for both). Run the
   NPM check; want `200`.
3. If neither works, stop and tell the owner; do not widen the binding or the rule.

The NPM proxy host forwards to the same address the check used (`host.docker.internal` for A,
the adapter address for B), port 2021.

**The NPM check**, from the host (needs Docker access, not administrator):

    docker exec <NPM_CONTAINER> curl -s -o /dev/null -w "%{http_code}\n" http://<address>:2021/api/v1/health

`/api/v1/health` answers `200` without signing in (the server has no `/api/v1/ping`). If the
container has no `curl`, run the same request from another container on the same Docker
network. `/health` answers
`{"status":"healthy","version":"...","commit":"<FULL_HASH>"}`.

## 5. The nightly backup

A scheduled task, **Wuzzanext nightly backup**:

| Setting | Value |
| --- | --- |
| Runs as | SYSTEM, whether anyone is signed in or not |
| Trigger | daily at 03:00 |
| Program | `C:\Wuzzanext\app\wuzzanext.exe` |
| Arguments | `backup -db C:\Wuzzanext\data\wuzzanext.db -uploads C:\Wuzzanext\data\uploads -to <BACKUP_DIR> -keep 14` |
| Start in | `C:\Wuzzanext\app` |
| Stop if it runs longer than | 1 hour |

Each run makes `<BACKUP_DIR>\wuzzanext-YYYYMMDD-HHMMSS\` with `wuzzanext.db` (a consistent
copy made with `VACUUM INTO` while the server keeps running, checked with
`PRAGMA integrity_check`) and `uploads\`. Copies older than 14 days are removed; the newest is
always kept. Exit code 0 and a last line `backup ok: <folder>` mean success; 1 is a failed
backup, 2 a wrong command line.

**Restore** (the owner decides when): stop the service; move `wuzzanext.db`, `-wal` and `-shm`
out of `C:\Wuzzanext\data`; copy `wuzzanext.db` and `uploads\` from the chosen backup folder
into `C:\Wuzzanext\data`; start the service; run the checks in section 7.

## 6. Updates

At a time the owner picks, away from family meal times.

1. The owner copies the new package to `C:\Wuzzanext\incoming\` and checks its SHA-256s
   against the build report for the new `<FULL_HASH>`.
2. Run the backup task once and wait for `backup ok` (the new version may change the database
   when it starts).
3. Stop the service.
4. Rename `C:\Wuzzanext\app\wuzzanext.exe` to `wuzzanext.exe.previous` (replacing an older
   one), then copy the new `wuzzanext.exe` and `wuzzanext-source.tar.gz` into
   `C:\Wuzzanext\app`. Leave `config\` and `C:\Wuzzanext\data` alone.
5. Start the service and run the checks in section 7.

**Going back:** stop the service, put `wuzzanext.exe.previous` back as `wuzzanext.exe`,
restore the database from the backup made in step 2 (section 5), start the service.

## 7. Checks afterwards

All must pass; record what each showed (not secrets, not family data).

1. The service is Running, and the backup task is Ready.
2. On the host, port 2021 listens on `<BIND_ADDRESS>` only:
   `Get-NetTCPConnection -LocalPort 2021 -State Listen` lists that one local address.
3. The NPM check (section 4) answers `200`.
4. `/health` (through `<PUBLIC_URL>`, or the NPM check with `/health`) shows `"commit"` equal
   to `<FULL_HASH>`, all 40 characters.
5. From another device on the home network (a laptop or phone, not the host):
   `Test-NetConnection <HOST_LAN_ADDRESS> -Port 2021` shows `TcpTestSucceeded : False`, or
   `curl -m 5 http://<HOST_LAN_ADDRESS>:2021/health` fails. The port must not answer.
6. The owner's checks in the web browser (owner guide, step 4): the About page shows the
   running version, and signing in works.
7. One backup run ends with `backup ok`, and the new folder holds `wuzzanext.db` and
   `uploads\`.
8. The log `C:\Wuzzanext\data\logs\wuzzanext.log` has no errors since the start.
