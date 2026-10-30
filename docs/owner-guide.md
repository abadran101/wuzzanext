# Wuzzanext on the home server: your steps

Everything here is done with your own Windows account, not an administrator window. The host
work (folders, service, firewall, backup task) is in `docs/deployment-spec.md`, which
Tokenmaxximus "Production deployments" carries out on the host and asks Windows for consent.
About 30 minutes the first time, 10 minutes for an update. Pick a time away from family meals.

## 1. Get the package

The supervisor builds it from the merged commit and reports, through the orchestrator, the
commit's full hash and the SHA-256 of `wuzzanext.exe`. Copy the folder
`wuzzanext-<first 12 characters>` to the home server: into `C:\Wuzzanext\incoming\` once it
exists, the first time into your own `Downloads` folder.

## 2. Check the files

On the home server, in a normal PowerShell window (Start > type PowerShell > Enter), paste:

```powershell
& {
  # Checks the newest wuzzanext-* package against its SHA256SUMS.txt.
  # want: OK on every line, then ALL MATCH
  # want: the wuzzanext.exe SHA-256 equals the one in the supervisor's report
  $base = 'C:\Wuzzanext\incoming'
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

## 3. Let Tokenmaxximus install it

In Tokenmaxximus on the home server, open **Production deployments**, give it
`deployment-spec.md` from the package and the full hash from the report, and approve the
Windows consent prompts it shows. The first time, it also needs your Google translation key
(`docs/translation-setup.md`, steps 1 to 5): type it in when it asks, on the host only.
Success: it reports every check in the spec's section 7, and the commit equals the full hash.

## 4. The proxy entry (first time only)

In the Nginx Proxy Manager web page, **Hosts > Proxy Hosts > Add Proxy Host**:

- Details: Domain Names: the app's name on your home network. Scheme `http`. Forward
  Hostname / IP: the address Tokenmaxximus reports from the spec's section 4 (for example
  `host.docker.internal`). Forward Port `2021`. Turn on **Block Common Exploits** and
  **Websockets Support**.
- SSL: your certificate, **Force SSL** and **HTTP/2 Support** on.
- Advanced: `proxy_read_timeout 300s;` (keeps live updates open).
- If this Nginx Proxy Manager also serves the internet, add an Access List that allows only
  your home network, and select it here.

Success: the app's HTTPS address opens the Wuzzanext sign-in page.

## 5. Check it in the browser

1. Open the app's address, then the **About** page (from the sign-in page or the menu). Want:
   "Running version" followed by the first 12 characters of the full hash.
2. Sign in, or create the first account. Want: the chore list opens.
3. Once the family's accounts exist, you can ask for new sign-ups to be turned off.

## 6. The Android app

Sign the APK (`docs/android-signing.md`), name it `wuzzanext.apk` and copy it into
`C:\Wuzzanext\data\downloads\`. Want: the About page now shows **Download the Android app**,
and it downloads on a phone on the home network. Replace the file to offer a new version.

## Updates

Steps 1 to 3 again with the new package; the spec's section 6 keeps the old program and a
backup for going back. Then step 5.1: the About page shows the new hash.
