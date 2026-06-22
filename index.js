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
        console.warn(TAG + ' window.__TAURI__.core.invoke not found, retrying...');
        return false;
    }

    if (core.invoke && core.invoke.__truncFixed) {
        console.log(TAG + ' Already installed, skipping');
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
        console.log(TAG + ' Installed invoke interceptor (target = ' + TARGET_MAX_LINES + ' lines)');
        return true;
    } catch (e) {
        console.error(TAG + ' Failed to override invoke:', e);
        return false;
    }
}

var attempts = 0;
var maxAttempts = 50;

function tryInstall() {
    if (installInvokeInterceptor()) {
        return;
    }
    attempts++;
    if (attempts < maxAttempts) {
        setTimeout(tryInstall, 100);
    } else {
        console.error(TAG + ' Failed to install after ' + maxAttempts + ' attempts');
    }
}

tryInstall();

setInterval(function () {
    var core = getTauriCore();
    if (core && core.invoke && !core.invoke.__truncFixed) {
        console.log(TAG + ' invoke was replaced, re-installing...');
        installInvokeInterceptor();
    }
}, 2000);

console.log(TAG + ' Extension loaded - will force maxLines = ' + TARGET_MAX_LINES);
