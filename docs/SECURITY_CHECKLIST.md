# Security checklist (v0.2)
Status words are strict: **Verified** = actually executed and passed in this project's build session. **Not verified** = implemented or planned but not tested.

## Threat model
| Threat | Mitigation in code |
|---|---|
| Malicious `.tpz` / template JSON | Shape validated in main; `sanitizeDoc` removes images that are not `data:image/(png\|jpeg\|gif\|webp)`; unknown nodes are dropped by the editor schema |
| XSS through filled values | Values are inserted as text nodes, never HTML |
| Remote content / tracking | CSP in app and in PDF pages (`default-src` limited, `img-src data:`); JS disabled in the PDF window |
| Path traversal | Template IDs must be UUIDs; output names pass `basename` + illegal-character removal; batch writes only into the folder chosen via dialog |
| Renderer compromise | `contextIsolation`, `sandbox`, no `nodeIntegration`, fixed IPC surface |
| Piracy / license bypass | **Weak**: any `TEMPLADZ…` code works (placeholder) |
| Supply chain | Dependencies pinned by caret ranges; run `npm audit` before release |
| Data at rest | Templates are plain JSON in the user profile (not encrypted) |
| Unsigned installer | SmartScreen warning; sign before distribution |

## Checklist
| Item | Status |
|---|---|
| `electron/main.cjs` and `preload.cjs` pass a Node syntax check | Verified |
| Bracket-batch parser (multi-row, broadcast, `;`/`,`, length/unknown/syntax errors) | Verified (executed with Node) |
| File-name builder and unique suffix | Verified (executed with Node) |
| `sanitizeDoc` removes unsafe images | Verified (executed with Node) |
| TypeScript syntax of all `src` files | Verified (no syntax errors; full type-check needs `npm install`) |
| Unit tests (`npm test`) | Not verified |
| App runs; menus, shortcuts, tables, images work | Not verified |
| PDF output correct, incl. Arabic shaping | Not verified |
| DOCX opens correctly in Word, incl. RTL, tables, images | Not verified |
| CSP blocks remote loads in the running app | Not verified |
| `npm audit` clean | Not verified |
| Installer builds and installs | Not verified |
| Real license verification | Not implemented |
| Code signing | Not implemented |
