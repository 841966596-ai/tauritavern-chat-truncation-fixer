/*
 * Chat Truncation Fixer for TauriTavern v2.1.1
 *
 * 閿佸畾 "瑕佸姞杞?# 鏉℃秷鎭? (chat_truncation) = TARGET锛屽苟纭繚瀹為檯鍔犺浇鐢熸晥銆? *   - 婊戝潡 #chat_truncation 閿佸畾
 *   - 鏁板瓧妗?#chat_truncation_counter 鍚屾
 *   - power_user.chat_truncation 閿佸畾
 *   - 鎷︽埅 Tauri invoke 鐨?maxLines (windowed 妯″紡瀹為檯鍔犺浇)
 */

var TARGET = 5;
var TAG = '[ChatTruncFixer]';

var INTERCEPTED_COMMANDS = {
    'get_chat_payload_tail': true,
    'get_group_chat_payload_tail': true
};

// === 閿佸畾 chat_truncation 璁剧疆锛堝彉閲?+ 涓や釜 UI 鍏冪礌锛?==
function lockTruncation() {
    // 鍐呴儴鍙橀噺
    try {
        if (window.power_user) {
            window.power_user.chat_truncation = TARGET;
        }
    } catch (e) {}

    // 婊戝潡
    try {
        var slider = document.getElementById('chat_truncation');
        if (slider && String(slider.value) !== String(TARGET)) {
            slider.value = String(TARGET);
        }
    } catch (e) {}

    // 鏁板瓧妗?    try {
        var counter = document.getElementById('chat_truncation_counter');
        if (counter && String(counter.value) !== String(TARGET)) {
            counter.value = String(TARGET);
        }
    } catch (e) {}
}

// === 鎷︽埅 Tauri invoke (windowed 妯″紡瀹為檯鍔犺浇鏉℃暟) ===
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

// === 鍚姩 ===
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

// 鍚姩鏃跺揩閫熻疆璇㈠畨瑁咃紝涔嬪悗姣忕缁存寔閿佸畾
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
