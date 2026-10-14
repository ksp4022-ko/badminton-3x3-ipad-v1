# 羽球排場：Claude 交接

## 接手方式

- Repo: `ksp4022-ko/badminton-3x3-ipad-v1`
- Git: `https://github.com/ksp4022-ko/badminton-3x3-ipad-v1.git`
- Branch: `main`
- 本次交接的功能基線：`be7b964`。
- 目前 APP_VERSION / package version：`2.1.0`（2026-10-14 新版控制台升為正式）。
- 交接文件本身會有較新的提交；請讀最新 main，不要 checkout 回上述舊提交。
- 先讀 `AGENTS.md`、`CLAUDE.md`，再依使用者下一個要求修改。
- Windows 目前工作目錄：`C:\Users\kosp\Documents\Roate_sim\github-publish-badminton-3x3-ipad-v1`。
- 工作區有既有未追蹤 `debug.log`，不要提交或刪除。

## 正式版與測試版

正式入口：
https://ksp4022-ko.github.io/badminton-3x3-ipad-v1/

目前驗收入口：
https://ksp4022-ko.github.io/badminton-3x3-ipad-v1/integrated-test.html

`integrated-test.html` 轉向：
`index.html?debug=1&setup-test=1&ui-preview=1`

2.1.0（使用者 2026-10-14 授權）起，新版控制台是正式入口的預設 UI：
`index.html` 無參數即載入 integrated-preview / integrated-admin（`NEW_CONSOLE`）。
- `?classic=1`：保留舊控制台（備援）。
- 測試入口仍需 `debug=1&setup-test=1&ui-preview=1`，只有測試入口顯示 ALPHA。
- 正式「▶ 快速開場」走 `setup-test.html?formal=1`，使用正式資料，完成或返回後回到 `index.html`；
  返回會還原進入前的狀態。
- `tools/ipad-visual-test.js` 以 `?classic=1` 檢查舊控制台；新版由 integrated-preview-test 覆蓋。

排場狀態：
- 正式 localStorage：`badminton3x3.ipad.v1.state`
- 測試 localStorage：`badminton3x3.ipad.v1.setup-test`
- 測試狀態不存在時，可讀取正式狀態作為種子；後續寫入測試 key。

音源資料庫：
- 正式 IndexedDB：`badminton-local-voice`
- 測試 IndexedDB：`badminton-setup-test-voice`
- Store：`voiceAssets`

不要混用這些 key，也不要以清空正式資料解決問題。

## 使用者已選定的設計

- 淺色、狀態＋操作型控制台；不是全頁大型按鈕堆疊。
- 頂部分頁：聚會 / 球員 / 語音 / 設定。
- 聚會頁：目前聚會，名單 / 音源 / 場地三項真實狀態。
- 小型「＋新聚會」在標題旁；絕對不要再改為全屏寬按鈕。
- 「更新今日名單」是文字入口，與遠端日安 API 更新不同。
- Header 下保留選取球員列：唯讀已打場次、原色姓名、取消選取。
- 球員、語音、設定各自放在分頁，不全部堆在聚會頁。
- iPhone 單欄；iPad 橫向用兩欄分類。
- 不要 iPad 整排螢幕寬「左說明、右按鈕」的布局。
- 自動呼叫 / 本機音源可分別收合並記住狀態。
- 低頻視覺 / 顯示選項放系統設定，沿用即時套用、即時保存。

二元開關：
- 一顆狀態按鈕，開啟藍底、關閉灰底。
- helperTextEnabled=true：顯示勾選與「已開啟 / 已關閉」。
- helperTextEnabled=false：只顯示功能名稱，保留顏色及 aria-pressed。
- 最新要求：開關是資訊卡內的小按鈕，不要全屏寬。

語音模式：
- 附圖風格的橘色滑動膠囊，文字「關閉 / Edge 模式 / 網頁音模式」。
- 可直接點選位置，也能拖動；放開才套用模式。
- 標籤、膠囊位置、下方設定 / 訊息必須同步。
- 模式名称不屬於可隱藏的輔助文字。

## 最近完成與驗收狀態

以下已實作、推送、確認 GitHub Pages 提供新資源；不代表全部已實機驗收。

- `e85c25e`：依使用者附圖改成四分頁、三項狀態的控制台。
- `f6a5c46`：單鍵狀態按鈕、姓名間隔與初版語音滑桿。
- `b1b9821`：修正滑桿切換失效，改成橘色膠囊。
- `be7b964`：系統設定卡片化，縮小開關按鈕。

最新設定頁有六個資訊卡：
上場提示、球員姓名、上場特效、手動操作、介面提示、畫面方向。
相關選項放同一卡；資料工具另外成區。

Pending：
- 最新資訊卡布局待使用者手機 / iPad 實機驗收。
- 橘色語音膠囊的最新修正尚無使用者明確 PASS 回覆。
- 尚未將新版 Admin 搬回正式入口，需使用者授權。
- 不要自行增加其他功能、升版或重做已通過的排場 / 動畫修正。

## 已確認的滑桿根因

舊實作以 `modeButtons[index].click()` 切換。
Admin 的 `initPanelScrollGuard()` 會在移動超過 12px 後設置
`panelTouch.blockUntil`（450ms）。`bindTap()` 因而擋住滑桿釋放後的代理 click。
結果是圓點移動，實際語音模式與下方內容不變。

目前 `commitMode()` 直接重用既有處理函式：
- `disableAutoCall()`
- `enableAutoCallWithEdgeCheck()`
- `enableBrowserAutoCall()`

不要改回模擬點擊，也不要刪除全域滑動防誤觸機制。
測試包含真正連續 touch drag，以及在 panel guard 啟動時切換的回歸案例。

## 音源設定基線

- 目前 production Edge 使用 IndexedDB 本機 MP3，不用 GitHub voice-poc 作播放來源。
- 中文：`zh-TW-HsiaoChenNeural`，default rate。
- 英文：`en-US-AnaNeural`，`-35%`。
- specVersion：`local-voice-v1`；旧 Aria 不能滿足此 spec。
- OFF / EDGE / BROWSER 分離；Edge 缺檔維持 Edge+Missing，無 Browser fallback。
- Edge 完整 preflight，禁止缺檔時部分播報。
- 固定倍速：1.0 / 1.1 / 1.2 / 1.3；不修改 MP3 或生成 voice spec。
- 姓名間隔：0 / 30 / 60 / 90 / 150 ms。
- Legacy：`legacyEdgeNameGapMs`，default 30。
- Modern 測試版：`modernEdgeNameGapMs`，default 90。
- Modern 此新設定只在 UI_PREVIEW_MODE + SETUP_TEST_MODE 生效。
- Browser 姓名間隔仍為 90ms；場地 / 預備句間隔仍為 110ms。
- 不要改 Worker / Render secret、TTS spec 或後端，除非使用者明確要求。

## 檔案導航

- `index.html`：正式 state / handlers / render / 選取列 / 排場與語音核心；只做必要變更。
- `integrated-test.html`：功能測試入口。
- `integrated-preview.js/css`：測試版載入、已完成翻牌與手動移動視覺。
- `integrated-admin.js/css`：目前四分頁、狀態、資訊卡、CTA、膠囊、折疊 UI。
- `setup-test.html`：五步新聚會導引；使用隔離資料，現有試播已修復。
- `admin-compare.html/js/css`：較舊 A/B 比較入口，保持可用；不是現在驗收入口。
- `admin-layout-review.html`：歷史靜態樣式提案，不是目前功能頁。
- `vendor/lucide/`：本機狀態圖示及授權。
- `vendor/motion.js`：目前 Modern 視覺使用的 Motion；Legacy 不載入。

DOM 重組時移動原本節點，不複製同 ID 或重新綁一套核心邏輯。
注意暫時移到 detached container 後，document.getElementById 找不到其中的節點。
選取列應維持 `.panel-head → #selectedAdminBar → .panel-body`。
preview 資源透過版本 query 載入；改檔案後更新最外層及內層資源 query，避免舊快取。

## 不可順便修改

排場演算法、順位、休息排序、Next、場次語意、球員身份、換場核心、
今日重新開始語意、場地數量、已驗收飛卡 / 光軌動畫、語音引擎 / queue、
音源內容、後端 API / D1 schema。

目前正式場地支援 2 / 3 / 4 面，最大 4；不要用早期聊天的「最大 3」覆寫它。
Legacy iOS12 與 Modern 需分開驗證；UA 模擬不能當成舊 iPad 實機已通過。

## 檢查與發布

必跑：
```
npm test
npm run test:visual
git diff --check
```

依修改範圍加跑：
```
npm run test:integrated-preview
npm run test:admin-compare
npm run test:edge-rate
node tools/setup-flow-test.js
```

最新資訊卡提交已通過標準 / 視覺 / 整合 / 比較測試。
前一語音修正另通過 edge-rate 測試。
未修改 generator 時不要執行 voice:sync 來補充或重生不相關 MP3。

測試通過後只提交預定檔案，再 push main。
不能確認測試 / 部署時直接說明，不要宣稱 PASS 或已上線。
按 AGENTS.md 的 HEAD BEFORE / AFTER、CHANGED FILES、CHANGES、TEST、
COMMIT、PUSH、ISSUES 回報；提供使用者能在手機打開的測試 URL。
