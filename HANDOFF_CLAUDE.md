# 羽球排場：Claude 交接

## 接手方式

- Repo: `ksp4022-ko/badminton-3x3-ipad-v1`
- Git: `https://github.com/ksp4022-ko/badminton-3x3-ipad-v1.git`
- Branch: `main`
- 本次交接的功能基線：`be7b964`。
- 目前 APP_VERSION / package version：`2.5.2`（2.1.0 新版控制台；2.1.1 看板磁吸；2.1.2 區頭樣式；2.2.0 系統配色；2.3.0 A 橘底＋無綠 D/E/F；2.4.0 藍牙鍵盤下場；2.4.1 舊 iPad 鍵盤相容；2.5.0 手機遙控下場；2.5.1 遙控頁重排；2.5.2 legacy 預備區數量）。
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

2.1.1 看板（新版控制台頁面才有，`?classic=1` 不變）：
- 預備區 / 休息區列與場地列（4 場手機）橫向 scroll-snap；休息區欄位用列上的 `.snap-marker` 當停點。
- 列尾需要對齊時優先加寬休息區（`snapRowEnd`），休息區比螢幕寬時才補不到一欄的空白。
- 4 場手機的場地比半屏窄 28px，露出相鄰場 56px 當提示。
- 休息區奇數人時多一個「點此放入」（`REST_EVEN_SLOTS`）。
- 2026-10-14 使用者正式網址實機驗收 2.1.1：PASS。

2.1.2 區頭（新版控制台頁面）：純色、同形狀；場地深青綠白字、預備區淡青綠深青綠字、休息區淡灰深灰字；場地區頭邊框同底色（移除黃框）。翻牌顏色不變。
- 2026-10-14 使用者正式網址實機驗收 2.1.2：PASS。

排場主畫面已決定不改（2026-10-14 使用者）：
- 浮動按鈕（••• / 重叫 / 預備）維持浮動，不改成固定工具列佔版面。
- 已有人的位置保留虛線框，除非之後有明顯更好的顯示方式。
- 區頭人數字級、「點此放入」淡字不是重點，有提醒即可。
- 排場以橫向使用為主；iPad 直向卡片偏細長不處理，維持現狀。

2.2.0 系統配色（設定 > 系統與資料 > 系統配色，介面提示下方；使用者要求直接上正式版）：
- 選項：預設 / A 青綠＋行動橘 / B 深藍高對比 / C 深色看板；存在 `settings.colorTheme`（'' / a / b / c），html 加 `theme-x` class。
- `themes.css` 由 `npm run build:themes`（tools/build-themes.js）從 index.html、integrated-preview.css、integrated-admin.css、setup-test.html 產生，勿手改；改了這些檔的顏色要重跑。
- 不換色：球員卡 12 色、翻牌 / 光軌 / 呼叫效果、已選球員黃色橫幅。快速開場頁跟隨主題（A/B 淺色、C 深色）。
- 2026-10-15 使用者正式網址實機驗收 2.2.0：PASS。

2.3.0 配色調整（使用者要求「a 給我底橘色，剩下 d,e,f 都新增選項」）：
- A 改為暖橘底＋青綠場地（A 暖橘底＋青綠）；新增無綠方案 D 靛藍＋活力橘、E 皇家藍＋活動橘、F 午夜藍＋琥珀。colorTheme 允許 '' / a–f。
- D/E/F 預設決定（使用者未回覆，可再調）：場地標頭與翻牌身分面＝場地色；翻牌上場面 D 天藍、E/F 紫；綠色按鈕與勾勾改場地色。
- 2026-10-15 使用者實機驗收 2.3.0：PASS。

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

2.4.0 藍牙數字鍵盤下場（使用者決定：一台鍵盤放中間；按數字跳確認、Enter 下場）：
- index.html `handleCourtDownKey`：數字鍵 1～4（不超過目前場數）→ 呼叫既有 `courtDown()` 的確認卡；Enter 等於按「下場」，Esc 等於取消。
- 不會觸發的情況：焦點在輸入框、管理面板開著、有其他對話框、按住重複、加 Ctrl/Cmd/Alt。確認卡開著時按其他數字不動作。
- 自動排場遇到 Next 空位不足時，會跳原本的提示框，需要用手點。
- 測試：tools/keyboard-court-down-test.js（舊版主控台、新版主控台、legacy iPad UA 都測，已加入 npm test）。
- 2.4.1：iOS 13.4 以前的 Safari，Esc 鍵名稱是 `UIKeyInputEscape`，已一併支援。legacy 只做過 Playwright UA 模擬，需要舊 iPad 實機驗收。

2.5.0 手機遙控下場（方案 A；使用者決定：盡量簡化、確認在手機、配對碼永久、顯示場上球員）：
- Worker（badminton-signup a3238a5）：`/api/court-remote` sync / ack / view / command，D1 migration `0027_court_remote.sql`。輪詢請求不寫 api_perf_logs。指令 60 秒未被 iPad 取走就過期；同一場 60 秒內重複按下會共用同一筆指令。
- iPad（index.html）：`state.settings.remoteCode`（16 碼）。每 3 秒呼叫 sync，場地狀態有變才上傳。收到指令後呼叫 `performCourtDown()`（原 `courtDown` 拆出確認卡之後的部分），不跳確認卡。iPad 有對話框或上場動畫時回報 busy。
- 主控台「設定 > 系統與資料 > 手機遙控」：啟用、QR code（vendor/qrcode-generator.js，MIT）、連線狀態、更換配對碼（舊碼刪除，舊手機失效）。
- 手機頁 `remote.html?c=配對碼`：顯示各場球員與 iPad 連線狀態；按下場後在手機確認，等待 iPad 回報結果。
- sw.js 不攔截 `/api/court-remote/`。
- 測試：tools/court-remote-test.js（用假 API，modern 與 legacy 都測）。另外已用本機 wrangler dev 加本機 D1 做過端對端測試。
- 自動排場遇到 Next 空位不足時，iPad 會跳原本的提示框，要等有人點掉後手機才會收到結果。
- 2026-10-18 使用者實機驗收 2.5.0：PASS。
- 2.5.1 遙控頁重排（impeccable skill）：iPhone 一頁看得到 4 面場（2×2 磚，3 面場時最後一面佔整列）；底色改冷色、場號大字；下場後結果卡列出「接著上場」的球員（iPad 下場後先上傳新場地狀態再回報 ack）。待實機驗收。

2.5.2 legacy 開放預備區數量（使用者要求）：
- 舊 iPad 原本固定 2 組（2 面場）／3 組（3、4 面場），從 2026-09-02 起隱藏設定。現在和新 iPad 一樣可以選。
- legacy 預備區格寬等於場地欄寬（`min(預備區數, 場數)` 等分），多出的預備區和休息區一起往右滑。scroll-snap 沿用既有設定（Safari 11 以上支援）。
- 已移除 legacy 的特殊處理：`activeNextCount`、`setNextCount` 的「暫不支援」提示、`setCourtMode` 的固定數量、`renderNextCountControls` 的隱藏、integrated-admin 的指標。
- 測試：ipad-visual-test 的 `runLegacyFiveNextCase`（classic 與新版主控台，iOS 12 UA）。只做過 UA 模擬，需要舊 iPad 實機驗收。

Pending：
- 最新資訊卡布局待使用者手機 / iPad 實機驗收。
- 橘色語音膠囊的最新修正尚無使用者明確 PASS 回覆。
- 尚未將新版 Admin 搬回正式入口，需使用者授權。
- 不要自行增加其他功能、升版或重做已通過的排場 / 動畫修正。
- 手機遙控下場：已在 2.5.0 實作（見上方）。Worker a3238a5 已由使用者部署（Cloudflare version 77ca2cbb-fb83-44a4-ba68-de6f5a295506，D1 0027 已套用）。待實機驗收。之後可加場邊實體按鈕（Wi‑Fi 按鈕，或藍牙按鈕＋網關）呼叫同一個 command 接口，硬體未實測。
- 藍牙數字鍵盤下場：已在 2.4.0 實作（見上方），待實機驗收。

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
