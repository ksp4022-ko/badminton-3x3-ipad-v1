# Gathering Setup Test

Entry: `setup-test.html`. The normal `index.html` entry remains unchanged visually.
Integrated preview entry: `integrated-test.html`. It uses the same isolated state
and audio database, with a Start Gathering button opening `setup-test.html?integrated=1`.
Modern preview adds Motion header flips and manual move/swap overlays. Legacy
does not load Motion and retains its court headers. Normal production entry does
not load preview assets. The bundled Motion file and license are copied from the
locked npm dependency; no CDN is required.
The setup page embeds the existing engine with `?debug=1&setup-test=1` and reuses
its roster reconciliation, TTS generator, IndexedDB, voice modes and reset handler.

Isolation:
- State key: `badminton3x3.ipad.v1.setup-test`
- Voice database: `badminton-setup-test-voice`
- First use copies the current formal roster/settings, never writes the formal key.
- The test draft stages players in Rest while keeping games until final confirmation.
- Existing played games trigger the original reset confirmation at the final step.
- Back/cancel keeps the test draft and generated test audio.
- This is an online test entry, not a new offline PWA release.

The real TTS endpoint is called by Generate. No generated assets or secrets are
committed. Formal local audio remains in `badminton-local-voice`.

Check with `node tools/setup-flow-test.js`. The integration test mocks only the
HTTP MP3 response; the existing generation/store/recheck/reset functions execute.
It covers modern/Legacy, per-player colors, missing assets, court label recheck,
reset cancellation/confirmation and formal-state isolation.
