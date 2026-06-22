/*
 * Chat Truncation Fixer for TauriTavern v2.1.1
 * =================================================
 *
 * 问题：TauriTavern 使用 windowed 模式加载聊天，初始加载
 *   DEFAULT_CHAT_WINDOW_LINES 条消息（Android = 50，桌面 = 100），
 *   导致长对话在启动时卡顿。
 *
 * chat_truncation 设置只控制 non-windowed 模式的截断，
 * 对 windowed 模式无效。
 *
 * 方案：拦截 window.__TAURI__.core.invoke，当后端命令是
 *   get_chat_payload_tail / get_group_chat_payload_tail 时，
 *   将 maxLines 参数强制改为 3。
 *
 * 这样保留了 windowed 模式的所有优势（分段加载、cursor），
 * 只是初始窗口更小。
 */

const TARGET_MAX_LINES = 3;
const TAG = '[ChatTruncFixer]';

// 需要拦截的 Tauri IPC 命令名
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
                console.log(`${TAG} ${command}: maxLines ${original} → ${TARGET_MAX_LINES}`);
                // 创建新对象避免修改原参数
                args = { ...args, maxLines: TARGET_MAX_LINES, max_lines: TARGET_MAX_LINES };
            }
        }
        return originalInvoke.call(this, command, args, options);
    };

    // 标记已安装
    Object.defineProperty(patchedInvoke, '__truncFixed', {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false,
    });

    tauri.core.invoke = patchedInvoke;
    console.log(`${TAG} Installed invoke interceptor (target = ${TARGET_MAX_LINES} lines)`);
    return true;
}

// == 安装 ==

// 尝试立即安装，如果 __TAURI__ 还没就绪则轮询等待
let attempts = 0;
const maxAttempts = 50;

function tryInstall() {
    if (installInvokeInterceptor()) {
        return; // 成功
    }

    attempts++;
    if (attempts < maxAttempts) {
        setTimeout(tryInstall, 100);
    } else {
        console.error(`${TAG} Failed to install after ${maxAttempts} attempts`);
    }
}

tryInstall();

// 双保险：如果 invoke 签名后续被 TauriTavern 的 init 代码重新赋值，
// 通过 Object.defineProperty 防止再次覆盖
// （在 tryInstall 成功后通过定时检查来兜底）
setInterval(() => {
    const tauri = window.__TAURI__;
    if (tauri?.core?.invoke && !tauri.core.invoke.__truncFixed) {
        console.log(`${TAG} invoke was replaced, re-installing...`);
        installInvokeInterceptor();
    }
}, 2000);

console.log(`${TAG} Extension loaded — will force maxLines = ${TARGET_MAX_LINES}`);
