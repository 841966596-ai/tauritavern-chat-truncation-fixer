/*
 * Chat Truncation Fixer for TauriTavern v2.1.1
 * Intercept Tauri invoke to force maxLines = 3 on chat load.
 */

var TARGET_MAX_LINES = 3;
var TAG = '[ChatTruncFixer]';

var INTERCEPTED_COMMANDS = {
    'get_chat_payload_tail': true,
    'get_group_chat_payload_tail': true
};

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
        console.log(TAG + ' Installed OK (target=' + TARGET_MAX_LINES + ')');
        return true;
    } catch (e) {
        console.error(TAG + ' override failed: ' + e.message);
        // fallback: try direct assignment
        try {
            core.invoke = patchedInvoke;
            console.log(TAG + ' Installed via direct assignment');
            return true;
        } catch (e2) {
            console.error(TAG + ' direct assignment also failed: ' + e2.message);
        }
        return false;
    }
}

var attempts = 0;
var maxAttempts = 100;

function tryInstall() {
    var core = getTauriCore();
    if (core) {
        console.log(TAG + ' Attempt ' + (attempts + 1) + ': __TAURI__.core.invoke found, installing...');
        if (installInvokeInterceptor()) {
            return;
        }
    } else {
        if (attempts % 10 === 0) {
            console.log(TAG + ' Attempt ' + (attempts + 1) + ': __TAURI__.core.invoke not ready yet');
        }
    }
    attempts++;
    if (attempts < maxAttempts) {
        setTimeout(tryInstall, 100);
    } else {
        console.error(TAG + ' Gave up after ' + maxAttempts + ' attempts. window.__TAURI__ = ' + (typeof window.__TAURI__));
    }
}

console.log(TAG + ' Script loaded. window.__TAURI__ = ' + (typeof window.__TAURI__));
tryInstall();

setInterval(function () {
    var core = getTauriCore();
    if (core && core.invoke && !core.invoke.__truncFixed) {
        console.log(TAG + ' invoke was replaced, re-installing...');
        installInvokeInterceptor();
    }
}, 2000);
