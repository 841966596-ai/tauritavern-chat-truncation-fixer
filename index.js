/*
 * Chat Truncation Fixer for TauriTavern v2.1.1
 * 
 * Dual path: intercept Tauri invoke (windowed) + override chat_truncation (non-windowed)
 */

var TARGET_MAX_LINES = 3;
var TAG = '[ChatTruncFixer]';

var INTERCEPTED_COMMANDS = {
    'get_chat_payload_tail': true,
    'get_group_chat_payload_tail': true
};

// === Path B: override chat_truncation ===
function overridePowerUser() {
    var ok = false;
    try {
        if (typeof window.power_user !== 'undefined' && window.power_user) {
            if (window.power_user.chat_truncation !== TARGET_MAX_LINES) {
                console.log(TAG + ' power_user.chat_truncation: ' + window.power_user.chat_truncation + ' -> ' + TARGET_MAX_LINES);
                window.power_user.chat_truncation = TARGET_MAX_LINES;
            }
            ok = true;
        }
    } catch (e) {}
    
    // Also update UI element if present
    try {
        var el = document.getElementById('chat_truncation');
        if (el && parseInt(el.value) !== TARGET_MAX_LINES) {
            el.value = String(TARGET_MAX_LINES);
        }
    } catch (e) {}
    
    // Also persist to localStorage
    try {
        var raw = localStorage.getItem('power_user');
        if (raw) {
            var pu = JSON.parse(raw);
            if (pu && pu.chat_truncation !== TARGET_MAX_LINES) {
                pu.chat_truncation = TARGET_MAX_LINES;
                localStorage.setItem('power_user', JSON.stringify(pu));
            }
        }
    } catch (e) {}
    
    return ok;
}

// === Path A: intercept Tauri invoke ===
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
            value: true, writable: false, enumerable: false, configurable: false
        });
    } catch (e) {}

    try {
        Object.defineProperty(core, 'invoke', {
            value: patchedInvoke, writable: true, configurable: true, enumerable: true
        });
        console.log(TAG + ' Invoke interceptor installed');
        return true;
    } catch (e) {
        console.error(TAG + ' Invoke override failed: ' + e.message);
        return false;
    }
}

// === Main ===
console.log(TAG + ' Script loaded (target=' + TARGET_MAX_LINES + ')');

var attempts = 0;
var maxAttempts = 100;
var invokeOk = false;
var puOk = false;

function tryInstall() {
    if (!invokeOk) {
        invokeOk = installInvokeInterceptor();
    }
    if (!puOk) {
        puOk = overridePowerUser();
    }
    
    if (!invokeOk || !puOk) {
        attempts++;
        if (attempts < maxAttempts) {
            setTimeout(tryInstall, 100);
        } else {
            console.error(TAG + ' Gave up. invoke=' + invokeOk + ' power_user=' + puOk);
        }
    }
}

tryInstall();

setInterval(function () {
    if (!invokeOk) {
        invokeOk = installInvokeInterceptor();
    } else {
        var core = getTauriCore();
        if (core && core.invoke && !core.invoke.__truncFixed) {
            invokeOk = false;
            invokeOk = installInvokeInterceptor();
        }
    }
    overridePowerUser();
}, 2000);
