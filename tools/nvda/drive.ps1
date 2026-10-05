param(
  [string]$Url = 'http://localhost:4200',
  [string]$StepsFile
)
# Drives a real Chrome window with real keystrokes and prints what NVDA would have spoken after each step,
# read from NVDA's debug log (NVDA runs with the silent synthesizer). Each spoken line carries the time NVDA
# spoke it, and each step the time its keys were sent, so latency can be read off directly.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic

$nvda = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $nvda 'nvda-log.txt'
$profile = Join-Path $nvda 'chrome-profile'
if (Test-Path $profile) { Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue }

function Get-LogLength { (Get-Item $log).Length }

# What NVDA spoke since byte offset $from: "[time] text" for every "Speaking [...]" entry.
function Get-SpeechSince([long]$from) {
  $fs = [System.IO.File]::Open($log, 'Open', 'Read', 'ReadWrite')
  try {
    $fs.Seek($from, 'Begin') | Out-Null
    $text = (New-Object System.IO.StreamReader($fs)).ReadToEnd()
  } finally { $fs.Dispose() }
  $headerAndSpeech = '\((\d\d:\d\d:\d\d\.\d+)\)[^\n]*\r?\nSpeaking \[(.*?)\]\r?\n'
  $quoted = "'((?:[^'\\]|\\.)*)'"
  foreach ($m in [regex]::Matches($text, $headerAndSpeech)) {
    $parts = [regex]::Matches($m.Groups[2].Value, $quoted) | ForEach-Object { $_.Groups[1].Value }
    $said = ($parts -join ' ').Trim()
    if ($said) { '[' + $m.Groups[1].Value + '] ' + $said }
  }
}

function Focus-Chrome {
  $proc = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -like "*Demo*" } | Select-Object -First 1
  if ($proc) { [Microsoft.VisualBasic.Interaction]::AppActivate($proc.Id) }
}

# Chrome as an app window (no address bar), fresh profile, accessibility forced on so NVDA sees the page tree.
$chrome = @('C:\Program Files\Google\Chrome\Application\chrome.exe','C:\Program Files (x86)\Google\Chrome\Application\chrome.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1
$start = Get-LogLength
Start-Process $chrome -ArgumentList "--user-data-dir=`"$profile`"", '--no-first-run', '--no-default-browser-check', '--force-renderer-accessibility', '--start-maximized', "--app=$Url"
Start-Sleep -Seconds 6
Focus-Chrome
Start-Sleep -Seconds 1
'### page load'
Get-SpeechSince $start | Select-Object -Last 12 | ForEach-Object { "  NVDA> $_" }

$steps = Get-Content $StepsFile | Where-Object { $_ -and -not $_.StartsWith('#') }
foreach ($line in $steps) {
  $label, $keys, $wait = $line -split '\|', 3
  if (-not $wait) { $wait = 1500 }
  Focus-Chrome
  $mark = Get-LogLength
  $sentAt = (Get-Date).ToString('HH:mm:ss.fff')
  if ($keys -ne '-') { [System.Windows.Forms.SendKeys]::SendWait($keys) }
  Start-Sleep -Milliseconds ([int]$wait)
  "### $label   [keys: $keys, sent at $sentAt]"
  $said = @(Get-SpeechSince $mark)
  if ($said.Count -eq 0) { '  NVDA> (nothing spoken)' } else { $said | ForEach-Object { "  NVDA> $_" } }
}
