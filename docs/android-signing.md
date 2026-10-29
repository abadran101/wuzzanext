# Signing and installing the Wuzzanext Android app

The supervisor builds an **unsigned** APK on the dev machine. You sign it on **your own Windows
PC**, where the signing key lives. Nothing here needs admin rights: everything installs into
your own user folders.

The key and its password stay on your PC and in your offline backups. Never put them on the
dev machine, in this repository or in a message, and keep them out of folders that sync to a
cloud (OneDrive, Google Drive). If the key is lost, no update will install over the app:
every phone has to uninstall it and install again, and changes made offline and not yet sent
are lost.

## Once: tools and key (~30 min)

Where: your own PC, your normal Windows account, Windows PowerShell.

1. Download two ZIP files with your browser (both free):
   - Temurin JDK 21, Windows x64, **the .zip, not the .msi**, from
     https://adoptium.net/temurin/releases/?os=windows&arch=x64&package=jdk&version=21
   - Android "Command line tools only" for Windows, from
     https://developer.android.com/studio#command-line-tools-only
2. Put both full paths into the first two lines of this block, then run it. It unpacks both
   into `%LOCALAPPDATA%\WuzzanextSigning`, installs Build-Tools 36.0.0 (which holds
   `apksigner`), and asks you to accept the Android license: type `y`.

```powershell
& {
  $JdkZip   = 'C:\Users\YOU\Downloads\OpenJDK21U-jdk_x64_windows_hotspot_XXX.zip'
  $ToolsZip = 'C:\Users\YOU\Downloads\commandlinetools-win-XXX_latest.zip'
  $ErrorActionPreference = 'Stop'
  $root = Join-Path $env:LOCALAPPDATA 'WuzzanextSigning'
  if (-not (Test-Path $JdkZip))   { Write-Host 'STOP: JDK zip not found'; return }
  if (-not (Test-Path $ToolsZip)) { Write-Host 'STOP: command line tools zip not found'; return }
  New-Item -ItemType Directory -Force "$root\sdk\cmdline-tools" | Out-Null
  Expand-Archive $JdkZip "$root\jdk-unpack" -Force
  $jdk = Get-ChildItem "$root\jdk-unpack" -Directory | Select-Object -First 1
  Expand-Archive $ToolsZip "$root\tools-unpack" -Force
  if (Test-Path "$root\sdk\cmdline-tools\latest") { Remove-Item -Recurse -Force "$root\sdk\cmdline-tools\latest" }
  Move-Item "$root\tools-unpack\cmdline-tools" "$root\sdk\cmdline-tools\latest"
  $env:JAVA_HOME = $jdk.FullName
  $env:Path = "$($jdk.FullName)\bin;$env:Path"
  & "$root\sdk\cmdline-tools\latest\bin\sdkmanager.bat" "--sdk_root=$root\sdk" 'build-tools;36.0.0'
  $out = @(
    "java: $(Test-Path "$($jdk.FullName)\bin\keytool.exe")   (want: True)",
    "apksigner: $(Test-Path "$root\sdk\build-tools\36.0.0\apksigner.bat")   (want: True)",
    "JDK folder: $($jdk.FullName)"
  )
  $out | ForEach-Object { Write-Host $_ }
  $out | Set-Clipboard
}
```

3. Create the key. `keytool` asks for a password (twice) and for a name and place; the
   password is typed at its prompt and is never shown or saved anywhere else. Use a long
   password and write it down for your backup.

```powershell
& {
  $root = Join-Path $env:LOCALAPPDATA 'WuzzanextSigning'
  $jdk = Get-ChildItem "$root\jdk-unpack" -Directory | Select-Object -First 1
  $keyDir = Join-Path $HOME 'WuzzanextKey'
  $ks = Join-Path $keyDir 'wuzzanext.jks'
  if (Test-Path $ks) { Write-Host 'STOP: a key already exists; never make a second one'; return }
  New-Item -ItemType Directory -Force $keyDir | Out-Null
  & "$($jdk.FullName)\bin\keytool.exe" -genkeypair -keystore $ks -alias wuzzanext -keyalg RSA -keysize 4096 -validity 10000
  $out = @("key file: $(Test-Path $ks)   (want: True)", "key path: $ks")
  $out | ForEach-Object { Write-Host $_ }
  $out | Set-Clipboard
}
```

4. Back up `%USERPROFILE%\WuzzanextKey\wuzzanext.jks` and its password in **two offline
   places**, for example two USB sticks kept in different rooms, or one USB stick and a
   printed password in a drawer. Not in a cloud folder, not in an email.

## Each release (~5 min)

The supervisor gives you, through the orchestrator, the APK file name and its SHA-256. Copy
the APK to your PC (for example into Downloads), put its path and the SHA-256 into the first
two lines, and run the block. `apksigner` asks for the key password.

```powershell
& {
  $Apk  = 'C:\Users\YOU\Downloads\app-release-unsigned.apk'
  $Hash = 'PASTE-THE-SHA-256-HERE'
  $root = Join-Path $env:LOCALAPPDATA 'WuzzanextSigning'
  $jdk = Get-ChildItem "$root\jdk-unpack" -Directory | Select-Object -First 1
  $bt = "$root\sdk\build-tools\36.0.0"
  $ks = Join-Path $HOME 'WuzzanextKey\wuzzanext.jks'
  $env:JAVA_HOME = $jdk.FullName
  $env:Path = "$($jdk.FullName)\bin;$env:Path"
  if (-not (Test-Path $Apk)) { Write-Host 'STOP: APK not found'; return }
  if (-not (Test-Path $ks))  { Write-Host 'STOP: key not found'; return }
  $got = (Get-FileHash $Apk -Algorithm SHA256).Hash
  if ($got -ne $Hash.Trim().ToUpper()) { Write-Host "STOP: SHA-256 does not match ($got)"; return }
  $signed = Join-Path (Split-Path $Apk) 'wuzzanext-signed.apk'
  $aligned = Join-Path (Split-Path $Apk) 'wuzzanext-aligned.apk'
  & "$bt\zipalign.exe" -f -p 4 $Apk $aligned
  if ($LASTEXITCODE -ne 0) { Write-Host 'STOP: zipalign failed'; return }
  & "$bt\apksigner.bat" sign --ks $ks --ks-key-alias wuzzanext --out $signed $aligned
  if ($LASTEXITCODE -ne 0) { Write-Host 'STOP: signing failed (wrong password?)'; return }
  Remove-Item $aligned
  $verify = & "$bt\apksigner.bat" verify --verbose --print-certs $signed | Out-String
  $out = @(
    "hash: matches   (want: matches)",
    "verified: $($verify -match 'Verifies')   (want: True)",
    "v2 scheme: $($verify -match 'v2 scheme \(APK Signature Scheme v2\): true')   (want: True)",
    ($verify -split "`n" | Where-Object { $_ -match 'certificate SHA-256 digest' } | Select-Object -First 1),
    "signed file: $signed"
  )
  $out | ForEach-Object { Write-Host $_ }
  $out | Set-Clipboard
}
```

The output is on your clipboard. The `certificate SHA-256 digest` line is the key's public
fingerprint, not a secret: it must be the same for every release. Send the output to the
orchestrator.

## Installing on a phone

1. Copy `wuzzanext-signed.apk` to the phone: a USB cable, or a folder shared on the home
   network. (A download page on the home server comes with the first deployment.)
2. On the phone, open the file with the Files app. The first time, Android asks to allow
   "Install unknown apps" for that app: allow it, go back, and tap Install. If Play Protect
   warns about an unknown app, choose "Install anyway".
3. Open Wuzzanext. The first time, it asks for the home server's address; type it and tap
   Save. The gear on the sign-in page changes it later.
4. Pick your profile and type your PIN, as on the web.

An update installs over the old app only when it is signed with the same key; your
sign-in and settings stay.
