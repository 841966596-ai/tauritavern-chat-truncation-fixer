/*
 * Chat Truncation Fixer for TauriTavern v2.1.1
 *
 * Lock "chat_truncation" = TARGET and make sure it actually takes effect.
 *   - Lock the #chat_truncation slider
 *   - Sync the #chat_truncation_counter number box
 *   - Lock power_user.chat_truncation
 *   - Intercept Tauri invoke maxLines (windowed mode actual load)
 */

var TARGET = 5;
var TAG = '[ChatTruncFixer]';

var INTERCEPTED_COMMANDS = {
    'get_chat_payload_tail': true,
    'get_group_chat_payload_tail': true
};

// === Lock chat_truncation setting (variable + two UI elements) ===
function lockTruncation() {
    // internal variable
    try {
        if (window.power_user) {
            window.power_user.chat_truncation = TARGET;
        }
    } catch (e) {}

    // slider
    try {
        var slider = document.getElementById('chat_truncation');
        if (slider && String(slider.value) !== String(TARGET)) {
            slider.value = String(TARGET);
        }
    } catch (e) {}

    // number box
    try {
        var counter = document.getElementById('chat_truncation_counter');
        if (counter && String(counter.value) !== String(TARGET)) {
            counter.value = String(TARGET);
        }
    } catch (e) {}
}

// === Intercept Tauri invoke (windowed mode actual line count) ===
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
            if (original != null && Number(original) !== TARGET) {
                console.log(TAG + ' ' + command + ': maxLines ' + original + ' -> ' + TARGET);
                var newArgs = {};
                for (var k in args) {
                    if (Object.prototype.hasOwnProperty.call(args, k)) {
                        newArgs[k] = args[k];
                    }
                }
                newArgs.maxLines = TARGET;
                newArgs.max_lines = TARGET;
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

// === Startup ===
console.log(TAG + ' Script loaded (target=' + TARGET + ')');

var invokeOk = false;

function tick() {
    if (!invokeOk) {
        invokeOk = installInvokeInterceptor();
    } else {
        var core = getTauriCore();
        if (core && core.invoke && !core.invoke.__truncFixed) {
            invokeOk = installInvokeInterceptor();
        }
    }
    lockTruncation();
}

// Poll fast at startup to install quickly, then keep locking periodically
var fastAttempts = 0;
function fastInit() {
    tick();
    fastAttempts++;
    if (fastAttempts < 50 && !invokeOk) {
        setTimeout(fastInit, 100);
    }
}
fastInit();

setInterval(tick, 1000);
