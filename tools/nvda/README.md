# NVDA scripted pass

Drives a real Chrome window with real keystrokes while NVDA runs silently, and prints what NVDA *would have
spoken* after each step, with the time it spoke and the time the keys were sent. It checks **what is
announced**; it does not replace a person who uses NVDA (see `docs/accessibility.md`).

Windows only. NVDA is not installed system-wide: a portable copy is enough.

## Setup (once)

```powershell
# 1. Get the installer (hash-verified by winget) and unpack a portable copy; nothing is installed.
winget download NVAccess.NVDA --download-directory .\dl
.\dl\NVDA_*.exe --create-portable-silent --portable-path="$PWD\portable"

# 2. A silent configuration: no speech, no welcome dialog, no update checks.
New-Item -ItemType Directory -Force config | Out-Null
@"
[general]
  showWelcomeDialog = False
  askToExit = False
  playStartAndExitSounds = False
[speech]
  synth = silence
[update]
  autoCheck = False
  startupNotification = False
"@ | Set-Content -Encoding ascii config\nvda.ini
```

## Run

Start NVDA with its log in this folder (`drive.ps1` reads `nvda-log.txt` next to itself):

```powershell
Start-Process .\portable\nvda.exe -ArgumentList "--config-path=`"$PWD\config`"", "--log-file=`"$PWD\nvda-log.txt`"", '--debug-logging', '--minimal', '--disable-addons' -WindowStyle Hidden
```

Start the app: `nx serve demo`, and either `node examples/commander-cli/serve.js` (the launcher) or
`cd apps/demo-server && go run .` (the single-program list). Then:

```powershell
.\drive.ps1 -Url http://localhost:4200 -StepsFile .\steps-launcher.txt
.\drive.ps1 -Url http://localhost:4200 -StepsFile .\steps-tasks.txt
```

A steps file has one step per line, `label|keys|wait-ms`, with keys in
[`SendKeys`](https://learn.microsoft.com/dotnet/api/system.windows.forms.sendkeys) notation (`{TAB}`, `{DOWN}`,
`^+m` for Ctrl+Shift+M, a literal space, `-` to send nothing). Lines starting with `#` are ignored.

## Things to know

- **It takes over your keyboard** while it runs (a few minutes). Don't type or click until it finishes.
- It opens Chrome as an app window with a throwaway profile (`chrome-profile/`, ignored by git), brings it to the
  front, and only targets that window.
- Under `SendKeys` the first Down after Tab did not move the list selection in the demo (every run), so
  announcements line up with the second press; see `docs/accessibility.md`.
