---
name: openclaw-gateway-keepalive
description: Node.js powered keep-alive & auto-restart for OpenClaw Gateway on Windows. Solves the PowerShell $PID read-only variable conflict when running under SYSTEM account. Triggered automatically on startup via Windows Scheduled Tasks.
emoji: 🛡️
eligible: true
disabled: false
source: github:Umatrr/openclaw-gateway-keepalive
author: Umatrr (Zhuoran Feng)
---

# openclaw-gateway-keepalive Skill

Node.js powered keep-alive & auto-restart solution for OpenClaw Gateway on Windows.

## Problem This Solves

The default PowerShell-based keep-alive script breaks on Windows because `$PID` is a read-only built-in variable in PowerShell. When running under SYSTEM account (via Scheduled Tasks), the restart logic fails completely with the error: "无法覆盖变量 PID" (Cannot overwrite variable PID).

## What This Does

- Checks Gateway health via HTTP every 30 seconds
- Confirms failure after 3 consecutive checks (90 seconds) to avoid false positives
- Triggers the existing "OpenClaw Gateway" Scheduled Task to restart
- 15-second grace period after restart before checking again
- 90-second cooldown between restart attempts
- Logs all activity to `~/.openclaw/workspace/keep-alive.log`

## Setup

### Step 1: Copy keep-alive.js

Place `keep-alive.js` in your OpenClaw workspace:
```
C:\Users\<your-user>\.openclaw\workspace\keep-alive.js
```

### Step 2: Create Scheduled Task

Run PowerShell as **Administrator**:
```powershell
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"C:\Users\<your-user>\.openclaw\workspace\keep-alive.js`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "OpenClaw KeepAlive" -Action $action -Trigger $trigger -Settings $settings -Principal $principal
```

### Step 3: Start it

```powershell
schtasks /run /tn "OpenClaw KeepAlive"
```

## Key Files

- `keep-alive.js` - The Node.js keep-alive script
- `README.md` - Full setup and troubleshooting guide

## Prerequisites

- OpenClaw installed on Windows
- Node.js installed at `C:\Program Files\nodejs\node.exe`
- OpenClaw Gateway installed as a Scheduled Task named "OpenClaw Gateway"

## Related Fix

If your MiniMax API is also broken, also fix:
```bash
openclaw config set models.providers.minimax.baseUrl https://api.minimaxi.com/anthropic/v1
openclaw config set models.providers.minimax.api anthropic-messages
openclaw gateway restart
```

## Credits

Discovered and solved by 小呣 (Feishu) + 马超 (QQ) — 南方科技大学, 2026-05-25