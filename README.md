# openclaw-gateway-keepalive

Node.js powered keep-alive & auto-restart solution for OpenClaw Gateway on Windows.

## Problem

The PowerShell-based keep-alive script fails on Windows because `$PID` is a read-only built-in variable in PowerShell. When running under SYSTEM account (via Scheduled Tasks), the restart logic breaks completely.

## Solution

A pure Node.js implementation that avoids PowerShell's `$PID` conflict entirely.

## Files

- `keep-alive.js` - Main Node.js keep-alive script
- `SKILL.md` - OpenClaw skill definition

## Setup

### 1. Deploy keep-alive.js

Copy `keep-alive.js` to your OpenClaw workspace:
```
C:\Users\<your-user>\.openclaw\workspace\keep-alive.js
```

### 2. Create Scheduled Task

Run PowerShell as Administrator:
```powershell
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"C:\Users\<your-user>\.openclaw\workspace\keep-alive.js`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "OpenClaw KeepAlive" -Action $action -Trigger $trigger -Settings $settings -Principal $principal
```

### 3. That's it!

The script will:
- Check Gateway health every 30 seconds
- Wait 3 consecutive failures (90 seconds total) before restarting
- Use schtasks to trigger the OpenClaw Gateway scheduled task
- Wait 15 seconds after restart before checking again
- Log to `~/.openclaw/workspace/keep-alive.log`

## Config Note

If your MiniMax API baseUrl is broken, fix it first:
```bash
openclaw config set models.providers.minimax.baseUrl https://api.minimaxi.com/anthropic/v1
openclaw config set models.providers.minimax.api anthropic-messages
openclaw gateway restart
```

## Credits

Problem discovered and solved by 小呣 (Feishu) + 马超 (QQ) — 南方科技大学.