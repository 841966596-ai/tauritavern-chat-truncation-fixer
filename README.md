# Chat Truncation Fixer for TauriTavern v2.1.1

## 问题

TauriTavern 使用 **windowed 模式** 加载聊天，初始加载 `DEFAULT_CHAT_WINDOW_LINES` 条消息：
- Android（移动端）：50 条
- 桌面端：100 条

长对话在启动时卡顿。`chat_truncation` 设置只影响 non-windowed 模式，对 windowed 模式无效。

## 解决方案

拦截 `window.__TAURI__.core.invoke`，当后端命令是 `get_chat_payload_tail` 或 `get_group_chat_payload_tail` 时，将 `maxLines` 参数强制改为 3。

保留 windowed 模式的所有优势（分段加载、cursor），只是初始窗口更小。

## 实现原理

### 调用链
```
script.js → loadCharacterChatPayloadTail({ maxLines: DEFAULT_CHAT_WINDOW_LINES })
    ↓
transport.js → invoke('get_chat_payload_tail', { maxLines: Number(maxLines) })
    ↓
tauri-bridge.js → window.__TAURI__.core.invoke(command, args)
    ↓
Rust 后端 → 返回最后 N 条消息
```

### 扩展做的事
```
window.__TAURI__.core.invoke 原始函数
    ↓ 扩展替换为
patchedInvoke(command, args)
    ↓ 如果 command == 'get_chat_payload_tail' 或 'get_group_chat_payload_tail'
    ↓ 将 args.maxLines 改为 3
    ↓ 调用原始 invoke
Rust 后端收到 maxLines = 3，只返回最后 3 条消息
```

## 安装

### 方法一：SillyTavern 扩展界面（推荐）
1. 打开 TauriTavern → 扩展面板（拼图图标）
2. Install Extension → 选择 `chat-truncation-fixer.zip`
3. 重启 TauriTavern

### 方法二：手动安装
将 `chat-truncation-fixer` 文件夹放到：
```
data/default-user/extensions/chat-truncation-fixer/
  ├── manifest.json
  └── index.js
```
然后重启 TauriTavern。

### 方法三：ADB 推送
```bash
adb shell mkdir -p /data/data/com.darkatse.tauritavern/files/data/default-user/extensions/chat-truncation-fixer
adb push manifest.json /data/data/com.darkatse.tauritavern/files/data/default-user/extensions/chat-truncation-fixer/
adb push index.js /data/data/com.darkatse.tauritavern/files/data/default-user/extensions/chat-truncation-fixer/
adb shell am force-stop com.darkatse.tauritavern
adb shell am start com.darkatse.tauritavern/.MainActivity
```

## 自定义

编辑 `index.js` 第一行：
```javascript
const TARGET_MAX_LINES = 3;  // 改为你想要的数字
```

## 文件结构
```
chat-truncation-fixer/
├── manifest.json
├── index.js
└── README.md
```

## 验证

启动 TauriTavern 后，在控制台日志中应看到：
```
[ChatTruncFixer] Extension loaded — will force maxLines = 3
[ChatTruncFixer] Installed invoke interceptor (target = 3 lines)
[ChatTruncFixer] get_chat_payload_tail: maxLines 50 → 3
```

## 兼容性
- TauriTavern 2.1.1 (arm64-v8a)
- TauriTavern 桌面版
- SillyTavern 桌面版（扩展检测到非 Tauri 环境时自动跳过，不会报错）
