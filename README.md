# Chat Truncation Fixer | 鑱婂ぉ鍔犺浇淇鍣?
> TauriTavern 2.1.1 鎵╁睍 鈥?寮哄埗鍒濆鍔犺浇 3 鏉℃秷鎭紝鍛婂埆闀垮璇濆惎鍔ㄥ崱椤?
## 馃 瑙ｅ喅浠€涔堥棶棰橈紵

TauriTavern 浣跨敤 windowed 妯″紡鍔犺浇鑱婂ぉ锛孉ndroid 绔粯璁ゅ垵濮嬪姞杞?**50 鏉℃秷鎭?*锛屾闈㈢ **100 鏉?*銆傞暱瀵硅瘽鍦ㄥ惎鍔ㄦ椂涓ラ噸鍗￠】銆?
鏈墿灞曢€氳繃鎷︽埅 Tauri IPC 璋冪敤锛屽皢鍒濆鍔犺浇鏉℃暟寮哄埗鏀逛负 **3 鏉?*锛屽惎鍔ㄧ寮€銆?
## 鉁?鏁堟灉

| | 淇敼鍓?| 淇敼鍚?|
|---|---|---|
| 鍚姩鍔犺浇 | 50 鏉?(Android) / 100 鏉?(妗岄潰) | 3 鏉?|
| 鍚姩閫熷害 | 闀垮璇濇槑鏄惧崱椤?| 绉掑紑 |
| 鏌ョ湅鍘嗗彶 | 鑷姩鍔犺浇鍏ㄩ儴 | 鐐瑰嚮 "Show more messages" 閫愭鍔犺浇 |

## 馃摝 瀹夎

1. 涓嬭浇鏈粨搴撶殑 `manifest.json` 鍜?`index.js`
2. 鏀惧埌 TauriTavern 鐨勬墿灞曠洰褰曪細
   ```
   data/default-user/extensions/tauritavern-chat-truncation-fixer/
   鈹溾攢鈹€ manifest.json
   鈹斺攢鈹€ index.js
   ```
3. 閲嶅惎 TauriTavern

## 鈿欙笍 鑷畾涔?
缂栬緫 `index.js` 绗竴琛岋細
```javascript
var TARGET_MAX_LINES = 3;  // 鏀规垚浣犳兂瑕佺殑鏁板瓧
```

## 馃敡 鍘熺悊

TauriTavern 鐨勮亰澶╁姞杞借皟鐢ㄩ摼锛?```
script.js 鈫?loadCharacterChatPayloadTail({ maxLines: 50 })
  鈫?transport.js 鈫?invoke('get_chat_payload_tail', { maxLines: 50 })
    鈫?window.__TAURI__.core.invoke(command, args)
      鈫?Rust 鍚庣杩斿洖鏈€鍚?N 鏉℃秷鎭?```

鏈墿灞曟嫤鎴?`window.__TAURI__.core.invoke`锛屽綋鍛戒护鏄?`get_chat_payload_tail` 鎴?`get_group_chat_payload_tail` 鏃讹紝灏?`maxLines` 鏀逛负 3銆備繚鐣?windowed 妯″紡鐨勬墍鏈変紭鍔匡紙鍒嗘鍔犺浇銆乧ursor锛夛紝鍙槸鍒濆绐楀彛鏇村皬銆?
## 馃搵 鍏煎鎬?
- 鉁?TauriTavern 2.1.1 (arm64-v8a)
- 鉁?TauriTavern 妗岄潰鐗?- 鉁?缇よ亰 + 瑙掕壊鑱婇兘鐢熸晥

## 鈿狅笍 娉ㄦ剰

濡傛灉 TauriTavern 寮€鍚簡"绂佹澶栭儴濯掍綋"锛屽彲鑳介渶瑕佸叧闂閫夐」鎵╁睍鎵嶈兘鐢熸晥銆?
---

MIT License
