# Wuzzanext on the home server: your steps

You install Wuzzanext yourself, on the home server, with Windows' own tools: File Explorer,
Notepad, Services, Registry Editor, Task Scheduler and Windows Defender Firewall. When Windows
asks for administrator permission, approve it. Only one command line is typed in an
administrator window (step 5); everything else is clicks. `docs/deployment-spec.md` describes
what the host ends up with; this guide is how you get there.

About 60 minutes the first time, 10 minutes for an update. Pick a time away from family meals.

Before you start, have the **Google translation key** ready (`docs/translation-setup.md`,
steps 1 to 5). It is required: Wuzzanext is not finished on the host until translation works.

## 1. Get the package

The supervisor builds it from the merged commit and reports, through the orchestrator, the
commit's full hash and the SHA-256 of `wuzzanext.exe`. Copy the folder
`wuzzanext-<first 12 characters>` to the home server: into `C:\services\wuzzanext\incoming\`
once it exists, the first time into your own `Downloads` folder.

## 2. Check the files

On the home server, in a normal PowerShell window (Start > type PowerShell > Enter), paste:

```powershell
& {
  # Checks the newest wuzzanext-* package against its SHA256SUMS.txt.
  # want: OK on every line, then ALL MATCH
  # want: the wuzzanext.exe SHA-256 equals the one in the supervisor's report
  $base = 'C:\services\wuzzanext\incoming'
  if (-not (Test-Path -LiteralPath $base)) { $base = Join-Path $env:USERPROFILE 'Downloads' }
  $dir = Get-ChildItem -LiteralPath $base -Directory -Filter 'wuzzanext-*' |
    Sort-Object LastWriteTime | Select-Object -Last 1
  if (-not $dir) {
    $msg = "STOP: no wuzzanext-* folder in $base"
    $msg | Set-Clipboard
    $msg
    return
  }
  $out = @("folder: $($dir.FullName)")
  $bad = 0
  foreach ($line in Get-Content -LiteralPath (Join-Path $dir.FullName 'SHA256SUMS.txt')) {
    if ($line.Trim() -eq '') { continue }
    $want, $name = $line -split '\s+', 2
    $file = Join-Path $dir.FullName $name
    if (-not (Test-Path -LiteralPath $file)) { $out += "MISSING $name"; $bad++; continue }
    $got = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower()
    if ($got -eq $want) { $out += "OK $name" } else { $out += "DIFFERENT $name"; $bad++ }
    if ($name -eq 'wuzzanext.exe') { $out += "wuzzanext.exe SHA-256: $got" }
  }
  if ($bad -eq 0) { $out += 'ALL MATCH' } else { $out += "STOP: $bad file(s) do not match; install nothing" }
  $out | Set-Clipboard
  $out
}
```

The result is on your clipboard. Success: `ALL MATCH`, and the `wuzzanext.exe` SHA-256 is the
one in the report. Otherwise stop and send the result to the supervisor.

**For an update, go to "Updates" at the end now.** Steps 3 to 13 are the first install only.

## 3. Folders and program (first install)

In File Explorer, create these folders (approve the administrator prompts):

- `C:\services` (if it is not there yet)
- `C:\services\wuzzanext`, and inside it `app`, `data` and `incoming`
- `C:\services\wuzzanext\app\config`
- `C:\services\wuzzanext\data\uploads`, `data\logs` and `data\downloads`
- the backup folder, best on a second disk, for example `D:\backups\wuzzanext`

Copy from the checked package:

- `wuzzanext.exe` and `wuzzanext-source.tar.gz` into `C:\services\wuzzanext\app`
- `selfhosted.yaml.template` into `C:\services\wuzzanext\app\config`, then rename it to
  `selfhosted.yaml` (make sure Explorer shows file extensions, so it is not
  `selfhosted.yaml.template` underneath).

Success: `C:\services\wuzzanext\app` holds `wuzzanext.exe`, `wuzzanext-source.tar.gz` and
`config\selfhosted.yaml`.

## 4. The configuration and its secrets (first install)

1. Make a new random secret for signing in. In a normal PowerShell window, paste:

   ```powershell
   & {
     # Makes a new random secret (64 hex characters) and puts it on the clipboard.
     # want: the line below; the secret itself is NOT shown and goes into selfhosted.yaml only
     $b = New-Object byte[] 32
     [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
     (($b | ForEach-Object { $_.ToString('x2') }) -join '') | Set-Clipboard
     'secret is on the clipboard (64 characters); paste it into selfhosted.yaml, nowhere else'
   }
   ```

2. Start > type **Notepad** > right-click > **Run as administrator**. **File > Open**
   `C:\services\wuzzanext\app\config\selfhosted.yaml` (choose **All files** to see it).
3. Replace each placeholder, keeping the quotes:
   - `<JWT_SECRET>`: paste the secret from step 1.
   - `<GOOGLE_KEY>`: your Google translation key (type or paste it here only).
   - `<PUBLIC_URL>`, three places: the app's HTTPS address on your home network, for example
     `https://<name>` (the same name you give Nginx Proxy Manager in step 10).
   - `<BIND_ADDRESS>`: `127.0.0.1` for now (step 8 checks it).
4. Save and close. Copy something else (any word) so the secret is no longer on the clipboard.

Success: **Edit > Find** `<` in the file finds nothing. Never paste the secret or the key into
a chat, an email or a message to the supervisor.

## 5. Register the service (first install; the one command line)

Start > type **Terminal** (or PowerShell) > right-click > **Run as administrator**. Type this
one line yourself, exactly, and press Enter (in PowerShell, `sc` alone means something else,
so it must be `sc.exe`; the space after each `=` is required):

    sc.exe create Wuzzanext binPath= "C:\services\wuzzanext\app\wuzzanext.exe" obj= "NT SERVICE\Wuzzanext" start= auto DisplayName= "Wuzzanext"

Want: `[SC] CreateService SUCCESS`. Close the administrator window. Do not start the service yet.

## 6. Permissions (first install)

Now that the service exists, its own account `NT SERVICE\Wuzzanext` can be named. In File
Explorer, right-click each folder > **Properties > Security > Advanced**.

1. `C:\services\wuzzanext`: **Disable inheritance** > **Convert inherited permissions into
   explicit permissions**. Then remove every entry except **Administrators** and **SYSTEM**
   (both Full control, "This folder, subfolders and files"). Apply.
2. `C:\services\wuzzanext\app`: **Add > Select a principal**, type `NT SERVICE\Wuzzanext`
   (Locations: this computer), **Check Names**, OK. Give it **Read & execute**. Apply.
3. `C:\services\wuzzanext\data`: add `NT SERVICE\Wuzzanext` with **Modify**. Apply.
4. `C:\services\wuzzanext\data\logs`: add your own Windows account with **Read**.
5. `C:\services\wuzzanext\data\downloads` and `C:\services\wuzzanext\incoming`: add your own
   Windows account with **Modify**.
6. The backup folder: the same as step 1 (inheritance off, only Administrators and SYSTEM).

Success: the Security tab of `app\config\selfhosted.yaml` lists only Administrators, SYSTEM
and Wuzzanext. Nobody else on the host can read the secret and the key.

## 7. Service settings and first start (first install)

1. Start > type **regedit** > Enter (approve). Go to
   `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Wuzzanext`. Right-click the right-hand
   pane > **New > Multi-String Value**, name it `Environment`, and give it these three lines:

       DT_ENV=selfhosted
       DT_SQLITE_PATH=C:\services\wuzzanext\data\wuzzanext.db
       DT_LOG_FILE=C:\services\wuzzanext\data\logs\wuzzanext.log

   OK, close Registry Editor. (No secrets here; they are in `selfhosted.yaml`.)
2. Start > type **services.msc** > Enter. Double-click **Wuzzanext** > **Recovery** tab:
   First, Second and Subsequent failures: **Restart the Service**; Reset fail count after
   **1** day; Restart service after **1** minute; tick **Enable actions for stops with
   errors**. Apply.
3. **General** tab: Startup type **Automatic**. Click **Start**. Want: Service status
   **Running**, and it still says Running after a minute (press F5 in the list).

If it stops again, open `C:\services\wuzzanext\data\logs\wuzzanext.log`: a "JWT secret" line
means step 4 was not saved; send the supervisor the last lines, without the secret or key.

## 8. Bind address and firewall (first install)

Wuzzanext must answer only the Nginx Proxy Manager container, never the home network
directly. Find the container's name in Docker Desktop (or `docker ps` in a normal PowerShell
window). Then, in a normal PowerShell window, type, with the name filled in:

    docker exec <NPM_CONTAINER> curl -s -o /dev/null -w "%{http_code}\n" http://host.docker.internal:2021/api/v1/health

- **Want `200`: option A.** Open **Windows Defender Firewall with Advanced Security**
  (Start > type `wf.msc`) > **Inbound Rules > New Rule**: Port, TCP, specific local port
  `2021`, **Block the connection**, all three profiles, name `Wuzzanext: block port 2021`.
  Run the `docker exec` line again. Want `200` still. If it now fails, delete the rule and use
  option B.
- **Otherwise: option B.** Send the supervisor what the line printed; it sends you the
  steps for spec section 4, option B (the server listens on the Docker network's host
  address, and one Allow rule lets only that network in). Do not use `0.0.0.0` or the
  server's home-network address.

Remember which address the check used (`host.docker.internal` for A); step 10 needs it.

## 9. The nightly backup (first install)

Start > type **Task Scheduler** > **Create Task** (not "Basic Task"):

- General: name `Wuzzanext nightly backup`; **Change User or Group**, type `SYSTEM`, OK;
  **Run whether user is logged on or not**.
- Triggers: New, **Daily**, 03:00.
- Actions: New, Start a program: `C:\services\wuzzanext\app\wuzzanext.exe`; arguments
  (with your backup folder):
  `backup -db C:\services\wuzzanext\data\wuzzanext.db -uploads C:\services\wuzzanext\data\uploads -to D:\backups\wuzzanext -keep 14`;
  Start in: `C:\services\wuzzanext\app`.
- Settings: **Stop the task if it runs longer than** 1 hour.

Right-click the task > **Run**. Want: after a few seconds, Last Run Result
`The operation completed successfully. (0x0)`, and a new `wuzzanext-<date>` folder in the backup
folder holding `wuzzanext.db` and `uploads`.

## 10. The proxy entry (first install)

In the Nginx Proxy Manager web page, **Hosts > Proxy Hosts > Add Proxy Host**:

- Details: Domain Names: the app's name on your home network (the one in `<PUBLIC_URL>`).
  Scheme `http`. Forward Hostname / IP: the address step 8 used (`host.docker.internal` for
  option A). Forward Port `2021`. Turn on **Block Common Exploits** and **Websockets Support**.
- SSL: your certificate, **Force SSL** and **HTTP/2 Support** on.
- Advanced: `proxy_read_timeout 300s;` (keeps live updates open).
- If this Nginx Proxy Manager also serves the internet, add an Access List that allows only
  your home network, and select it here.

Success: the app's HTTPS address opens the Wuzzanext sign-in page.

## 11. Check it in the browser

1. Open the app's address, then the **About** page (from the sign-in page or the menu). Want:
   "Running version" followed by the first 12 characters of the full hash.
2. Sign in, or create the first account. Want: the chore list opens.
3. **Translation (required):** create a chore named `Water the plants`, switch the language in
   the user menu to Arabic, and open the chore list. Want: the chore's name in Arabic after a
   second or two, and **Translated** with **See original** on the chore page. If it stays in
   English, see "If it does not work" in `docs/translation-setup.md`; the install is not done
   until this passes.
4. From another device on the home network (a phone's browser is fine), open
   `http://<the server's home-network address>:2021/health`. Want: it does **not** load. Only
   the HTTPS address works.
5. Once the family's accounts exist, you can ask for new sign-ups to be turned off.

Send the supervisor: the About page's version, and pass or fail for checks 2 to 4 and the
backup run (no names, no secrets).

## 12. The Android app

Sign the APK (`docs/android-signing.md`), name it `wuzzanext.apk` and copy it into
`C:\services\wuzzanext\data\downloads\`. Want: the About page now shows **Download the
Android app**, and it downloads on a phone on the home network. Replace the file to offer a
new version.

## Updates

1. Steps 1 and 2 with the new package, copied into `C:\services\wuzzanext\incoming\`.
2. Task Scheduler: right-click **Wuzzanext nightly backup** > **Run**; wait for `(0x0)`.
3. Services: **Wuzzanext** > **Stop**.
4. In `C:\services\wuzzanext\app` (approve the prompts): delete `wuzzanext.exe.previous` if
   there is one, rename `wuzzanext.exe` to `wuzzanext.exe.previous`, then copy the new
   `wuzzanext.exe` and `wuzzanext-source.tar.gz` in from the package. Leave `config` and the
   `data` folder alone.
5. Services: **Wuzzanext** > **Start**. Then step 11.1: the About page shows the new hash.

**Going back:** stop the service, delete `wuzzanext.exe`, rename `wuzzanext.exe.previous`
back to `wuzzanext.exe`, restore the database from the backup made in update step 2
(`docs/deployment-spec.md`, section 5), start the service.
