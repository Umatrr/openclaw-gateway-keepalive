// OpenClaw 保活脚本 - Node.js 版本
// 解决 PowerShell $PID 只读变量冲突问题
// 每30秒检查一次健康状态，挂掉后通过 schtasks 重启

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');

const GATEWAY_URL = 'http://127.0.0.1:18789';
const LOG_FILE = 'C:\\Users\\Administrator\\.openclaw\\workspace\\keep-alive.log';
const CHECK_INTERVAL_MS = 30000;
const RESTART_THRESHOLD = 3;
const COOLDOWN_MS = 90000;

function log(msg) {
    const time = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
    const entry = `${time} ${msg}\n`;
    fs.appendFileSync(LOG_FILE, entry);
    console.log(entry.trim());
}

function checkGatewayAlive() {
    return new Promise((resolve) => {
        const req = http.get(GATEWAY_URL + '/health', (res) => {
            res.resume();
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

function getGatewayPid() {
    return new Promise((resolve) => {
        exec('netstat -ano | findstr :18789', { timeout: 5000 }, (err, stdout) => {
            if (err || !stdout) return resolve(null);
            const m = stdout.match(/LISTENING\s+(\d+)/);
            resolve(m ? parseInt(m[1]) : null);
        });
    });
}

function killProcess(pid) {
    return new Promise((resolve) => {
        exec(`taskkill /F /PID ${pid}`, { timeout: 5000 }, (err) => {
            resolve(!err);
        });
    });
}

function triggerScheduledTask() {
    return new Promise((resolve) => {
        exec('schtasks /run /tn "OpenClaw Gateway"', { timeout: 5000 }, (err) => {
            log(err ? `[ERR] schtasks failed: ${err.message}` : '[SCHTASKS] triggered');
            resolve(!err);
        });
    });
}

async function main() {
    log('==========================================');
    log('=== Node.js 保活脚本启动 ===');
    log('==========================================');

    let consecutiveFailures = 0;
    let lastRestartTime = 0;

    while (true) {
        const alive = await checkGatewayAlive();
        const pid = await getGatewayPid();

        if (alive) {
            if (consecutiveFailures > 0) {
                log(`[OK] Gateway 正常 (PID=${pid})`);
                consecutiveFailures = 0;
            }
        } else {
            consecutiveFailures++;
            log(`[WARN] Gateway 无响应 (第 ${consecutiveFailures} 次), PID=${pid}`);

            if (consecutiveFailures >= RESTART_THRESHOLD) {
                const now = Date.now();
                if (now - lastRestartTime > COOLDOWN_MS) {
                    log('[RESTART] 执行重启...');
                    lastRestartTime = now;

                    if (pid) {
                        await killProcess(pid);
                        await new Promise(r => setTimeout(r, 3000));
                    }

                    await triggerScheduledTask();
                    await new Promise(r => setTimeout(r, 15000)); // 15秒足够 Gateway 完全启动

                    const revived = await checkGatewayAlive();
                    const newPid = await getGatewayPid();
                    log(revived ? `[OK] 重启成功 PID=${newPid}` : '[ERR] 重启失败');
                } else {
                    log(`[COOL] 冷却中，跳过 (距上次 ${Math.round((now - lastRestartTime)/1000)}s)`);
                }
                consecutiveFailures = 0;
            }
        }

        await new Promise(r => setTimeout(r, CHECK_INTERVAL_MS));
    }
}

main().catch(e => { log(`[FATAL] ${e.message}`); process.exit(1); });