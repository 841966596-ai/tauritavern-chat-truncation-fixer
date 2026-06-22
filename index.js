/*
 * Chat Truncation Fixer for TauriTavern v2.1.1
 * 
 * 鍙岃矾寰勮鐩栵細
 *   璺緞A (windowed): 鎷︽埅 Tauri invoke锛屾敼 maxLines
 *   璺緞B (non-windowed): 璁剧疆 power_user.chat_truncation
 */

var TARGET_MAX_LINES = 3;
var TAG = '[ChatTruncFixer]';

var INTERCEPTED_COMMANDS = {
    'get_chat_payload_tail': true,
    'get_group_chat_payload_tail': true
};

// === 璺緞B: 璁剧疆 chat_truncation ===
// 閫氳繃 localStorage 鎸佷箙鍖栵紝灏濊瘯鍦?script.js 涔嬪墠鐢熸晥
try {
    // SillyTavern power_user settings 瀛樺湪 localStorage
    var raw = localStorage.getItem('power_user');
    if (raw) {
        var pu = JSON.parse(raw);
        if (pu && pu.chat_truncation !== TARGET_MAX_LINES) {
            console.log(TAG + ' localStorage chat_truncation: ' + pu.chat_truncation + ' -> ' + TARGET_MAX_LINES);
            pu.chat_truncation = TARGET_MAX_LINES;
            localStorage.setItem('power_user', JSON.stringify(pu));
        }
    }
} catch (e) {
    console.warn(TAG + ' localStorage power_user update failed: ' + e.message);
}

// 杩愯鏃惰鐩?power_user 瀵硅薄锛堝鏋滃凡鍔犺浇锛?function overridePowerUser() {
    try {
        // SillyTavern 鎶?power_user 鎸傚湪 window 涓?        if (typeof window.power_user !== 'undefined' && window.power_user) {
            if (window.power_user.chat_truncation !== TARGET_MAX_LINES) {
                console.log(TAG + ' power_user.chat_truncation: ' + window.power_user.chat_truncation + ' -> ' + TARGET_MAX_LINES);
                window.power_user.chat_truncation = TARGET_MAX_LINES;
            }
            return true;
        }
    } catch (e) {}
    return false;
}

// UI 鍏冪礌瑕嗙洊
function overrideUI() {
    try {
        var el = document.getElementById('chat_truncation');
        if (el && parseInt(el.value) !== TARGET_MAX_LINES) {
            el.value = String(TARGET_MAX_LINES);
        }
    } catch (e) {}
}

// === 璺緞A: 鎷︽埅 Tauri invoke ===
function getTauriCore() {
    try {
        var t = window.__TAURI__;
        if (t && t.core && typeof t.core.invoke === 'function') {
            return t.core;
        }
    } catch (e) {}
    return null;
}

function installInvokeInterceptor() {
    var core = getTauriCore();
    if (!core) {
        return false;
    }

    if (core.invoke && core.invoke.__truncFixed) {
        return true;
    }

    var originalInvoke = core.invoke;

    var patchedInvoke = function (command, args, options) {
        if (INTERCEPTED_COMMANDS[command] && args && typeof args === 'object') {
            var original = args.maxLines != null ? args.maxLines : args.max_lines;
            if (original != null && Number(original) > TARGET_MAX_LINES) {
                console.log(TAG + ' ' + command + ': maxLines ' + original + ' -> ' + TARGET_MAX_LINES);
                var newArgs = {};
                for (var k in args) {
                    if (Object.prototype.hasOwnProperty.call(args, k)) {
                        newArgs[k] = args[k];
                    }
                }
                newArgs.maxLines = TARGET_MAX_LINES;
                newArgs.max_lines = TARGET_MAX_LINES;
                args = newArgs;
            }
        }
        return originalInvoke.call(this, command, args, options);
    };

    try {
        Object.defineProperty(patchedInvoke, '__truncFixed', {
            value: true,
            writable: false,
            enumerable: false,
            configurable: false
        });
    } catch (e) {}

    try {
        Object.defineProperty(core, 'invoke', {
            value: patchedInvoke,
            writable: true,
            configurable: true,
            enumerable: true
        });
        console.log(TAG + ' Invoke interceptor installed');
        return true;
    } catch (e) {
        console.error(TAG + ' Invoke override failed: ' + e.message);
        try {
            core.invoke = patchedInvoke;
            console.log(TAG + ' Invoke installed via direct assignment');
            return true;
        } catch (e2) {
            console.error(TAG + ' Direct assignment also failed: ' + e2.message);
        }
        return false;
    }
}

// === 鍚姩 ===
console.log(TAG + ' Script loaded');

// 绔嬪嵆灏濊瘯瑕嗙洊 power_user
overridePowerUser();

var attempts = 0;
var maxAttempts = 100;

function tryInstall() {
    var installed = installInvokeInterceptor();
    var puOk = overridePowerUser();
    
    if (installed && puOk) {
        return;
    }
    
    attempts++;
    if (attempts < maxAttempts) {
        setTimeout(tryInstall, 100);
    } else {
        console.error(TAG + ' Gave up. invoke=' + (installInvokeInterceptor() ? 'ok' : 'fail') + ' power_user=' + (overridePowerUser() ? 'ok' : 'fail'));
    }
}

tryInstall();

// 瀹氭湡纭繚涓や釜璺緞閮界敓鏁?setInterval(function () {
    var core = getTauriCore();
    if (core && core.invoke && !core.invoke.__truncFixed) {
        installInvokeInterceptor();
    }
    overridePowerUser();
    overrideUI();
}, 2000);

console.log(TAG + ' Init done (target=' + TARGET_MAX_LINES + ')');
