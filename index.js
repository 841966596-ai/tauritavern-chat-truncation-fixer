/*
 * Chat Truncation Fixer for TauriTavern v2.1.1
 * =================================================
 *
 * 闂锛歍auriTavern windowed 妯″紡鍒濆鍔犺浇 50 鏉℃秷鎭紙Android锛夛紝
 *   瀵艰嚧闀垮璇濆惎鍔ㄥ崱椤裤€? *
 * 鏂规锛氭嫤鎴?window.__TAURI__.core.invoke锛屽綋鍚庣鍛戒护鏄? *   get_chat_payload_tail / get_group_chat_payload_tail 鏃讹紝
 *   灏?maxLines 鍙傛暟寮哄埗鏀逛负 3銆? */

const TARGET_MAX_LINES = 3;
const TAG = '[ChatTruncFixer]';

const INTERCEPTED_COMMANDS = new Set([
    'get_chat_payload_tail',
    'get_group_chat_payload_tail',
]);

function installInvokeInterceptor() {
    const tauri = window.__TAURI__;
    if (!tauri?.core?.invoke) {
        console.warn(`${TAG} window.__TAURI__.core.invoke not found, retrying...`);
        return false;
    }

    if (tauri.core.invoke.__truncFixed) {
        console.log(`${TAG} Already installed, skipping`);
        return true;
    }

    const originalInvoke = tauri.core.invoke;

    const patchedInvoke = function (command, args, options) {
        if (INTERCEPTED_COMMANDS.has(command) && args && typeof args === 'object') {
            const original = args.maxLines ?? args.max_lines;
            if (original !== undefined && Number(original) > TARGET_MAX_LINES) {
                console.log(`${TAG} ${command}: maxLines ${original} 鈫?${TARGET_MAX_LINES}`);
                args = { ...args, maxLines: TARGET_MAX_LINES, max_lines: TARGET_MAX_LINES };
            }
        }
        return originalInvoke.call(this, command, args, options);
    };

    // 鏍囪宸插畨瑁?    Object.defineProperty(patchedInvoke, '__truncFixed', {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false,
    });

    // 鐢?defineProperty 瑕嗙洊鍙鐨?invoke
    try {
        Object.defineProperty(tauri.core, 'invoke', {
            value: patchedInvoke,
            writable: true,
            configurable: true,
            enumerable: true,
        });
        console.log(`${TAG} Installed invoke interceptor (target = ${TARGET_MAX_LINES} lines)`);
        return true;
    } catch (e) {
        console.error(`${TAG} Failed to override invoke:`, e);
        return false;
    }
}

let attempts = 0;
const maxAttempts = 50;

function tryInstall() {
    if (installInvokeInterceptor()) {
        return;
    }

    attempts++;
    if (attempts < maxAttempts) {
        setTimeout(tryInstall, 100);
    } else {
        console.error(`${TAG} Failed to install after ${maxAttempts} attempts`);
    }
}

tryInstall();

// 鍏滃簳锛氬畾鏈熸鏌?invoke 鏄惁琚繕鍘?setInterval(() => {
    const tauri = window.__TAURI__;
    if (tauri?.core?.invoke && !tauri.core.invoke.__truncFixed) {
        console.log(`${TAG} invoke was replaced, re-installing...`);
        installInvokeInterceptor();
    }
}, 2000);

console.log(`${TAG} Extension loaded 鈥?will force maxLines = ${TARGET_MAX_LINES}`);
