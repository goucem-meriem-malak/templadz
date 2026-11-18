const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const isDev = process.argv.includes('--dev');
const tplDir = () => path.join(app.getPath('userData'), 'templates');
const licFile = () => path.join(app.getPath('userData'), 'license.txt');
const ID_RE = /^[a-f0-9-]{36}$/;
const KINDS = ['pdf', 'docx'];
let batchDir = null; // the only folder the renderer may write into (chosen via dialog)
const win = (e) => BrowserWindow.fromWebContents(e.sender);

function createWindow() {
  const w = new BrowserWindow({
    width: 1360, height: 900, backgroundColor: '#ececee', title: 'Templadz',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  w.setMenuBarVisibility(false);
  if (isDev) w.loadURL('http://localhost:5173');
  else w.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// ---- Templates (local JSON files) ----
const tplPath = (id) => { if (!ID_RE.test(id)) throw new Error('bad id'); return path.join(tplDir(), id + '.json'); };
const validTpl = (t) => t && typeof t.name === 'string' && t.doc && t.doc.type === 'doc';
const slim = (t) => JSON.stringify({ name: t.name, doc: t.doc, header: String(t.header || ''), footer: String(t.footer || '') });

ipcMain.handle('tpl:list', () => {
  fs.mkdirSync(tplDir(), { recursive: true });
  return fs.readdirSync(tplDir()).filter((f) => f.endsWith('.json')).map((f) => {
    try {
      const p = path.join(tplDir(), f);
      return { id: f.slice(0, -5), name: JSON.parse(fs.readFileSync(p, 'utf8')).name, updated: fs.statSync(p).mtimeMs };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => b.updated - a.updated);
});
ipcMain.handle('tpl:load', (_e, id) => JSON.parse(fs.readFileSync(tplPath(id), 'utf8')));
ipcMain.handle('tpl:save', (_e, t) => {
  if (!validTpl(t)) throw new Error('invalid template');
  fs.mkdirSync(tplDir(), { recursive: true });
  const id = t.id && ID_RE.test(t.id) ? t.id : crypto.randomUUID();
  fs.writeFileSync(tplPath(id), slim(t));
  return id;
});
ipcMain.handle('tpl:delete', (_e, id) => { fs.rmSync(tplPath(id), { force: true }); });

// ---- Sharing (.tpz = JSON package; attach it to an email yourself) ----
ipcMain.handle('tpl:export', async (e, id) => {
  const t = JSON.parse(fs.readFileSync(tplPath(id), 'utf8'));
  const { filePath, canceled } = await dialog.showSaveDialog(win(e), {
    defaultPath: t.name.replace(/[\\/:*?"<>|]/g, '_') + '.tpz', filters: [{ name: 'Templadz', extensions: ['tpz'] }],
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, JSON.stringify({ format: 'templadz', v: 2, ...JSON.parse(slim(t)) }));
  shell.showItemInFolder(filePath);
  shell.openExternal('mailto:?subject=' + encodeURIComponent(t.name));
  return filePath;
});
ipcMain.handle('tpl:import', async (e) => {
  const { filePaths, canceled } = await dialog.showOpenDialog(win(e), {
    filters: [{ name: 'Templadz', extensions: ['tpz'] }], properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return null;
  if (fs.statSync(filePaths[0]).size > 50 * 1024 * 1024) throw new Error('too large');
  const pkg = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  if (pkg.format !== 'templadz' || !validTpl(pkg)) throw new Error('invalid package');
  const id = crypto.randomUUID();
  fs.mkdirSync(tplDir(), { recursive: true });
  fs.writeFileSync(tplPath(id), slim(pkg));
  return id;
});

// ---- PDF / DOCX output ----
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tok = (s) => esc(s)
  .replace(/\{\{\s*page\s*\}\}/g, '<span class="pageNumber"></span>')
  .replace(/\{\{\s*pages\s*\}\}/g, '<span class="totalPages"></span>')
  .replace(/\{\{\s*date\s*\}\}/g, '<span class="date"></span>');
function hfOpts(hf) {
  if (!hf || (!hf.header && !hf.footer)) return {};
  const box = (t) => `<div style="font-size:9px;width:100%;padding:0 20mm;text-align:center;color:#555">${tok(t)}</div>`;
  return { displayHeaderFooter: true, headerTemplate: box(hf.header), footerTemplate: box(hf.footer) };
}
async function renderPdf(html, hf) {
  const tmp = path.join(app.getPath('temp'), 'templadz-' + crypto.randomUUID() + '.html');
  fs.writeFileSync(tmp, html);
  const w = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true, contextIsolation: true } });
  try {
    await w.loadFile(tmp);
    return await w.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, ...hfOpts(hf) });
  } finally { w.destroy(); fs.rmSync(tmp, { force: true }); }
}
const bytes = (kind, payload, hf) => (kind === 'pdf' ? renderPdf(payload, hf) : Buffer.from(payload, 'base64'));
const safeName = (n) => path.basename(String(n)).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'document';

ipcMain.handle('file:save', async (e, kind, payload, defaultName, hf) => {
  if (!KINDS.includes(kind)) throw new Error('bad kind');
  const { filePath, canceled } = await dialog.showSaveDialog(win(e), {
    defaultPath: safeName(defaultName), filters: [{ name: kind.toUpperCase(), extensions: [kind] }],
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, await bytes(kind, payload, hf));
  return filePath;
});
ipcMain.handle('file:write', async (_e, kind, name, payload, hf) => {
  if (!KINDS.includes(kind) || !batchDir) throw new Error('not allowed');
  fs.writeFileSync(path.join(batchDir, safeName(name) + '.' + kind), await bytes(kind, payload, hf));
  return true;
});
ipcMain.handle('dir:pick', async (e) => {
  const { filePaths, canceled } = await dialog.showOpenDialog(win(e), { properties: ['openDirectory', 'createDirectory'] });
  batchDir = canceled || !filePaths[0] ? null : filePaths[0];
  return batchDir;
});
ipcMain.handle('csv:pick', async (e) => {
  const { filePaths, canceled } = await dialog.showOpenDialog(win(e), { filters: [{ name: 'CSV', extensions: ['csv'] }], properties: ['openFile'] });
  return canceled || !filePaths[0] ? null : fs.readFileSync(filePaths[0], 'utf8');
});
// Print = render a PDF to a temp file and open it in the system PDF viewer (reliable print dialog)
ipcMain.handle('doc:print', async (_e, html, hf) => {
  const p = path.join(app.getPath('temp'), 'templadz-print.pdf');
  fs.writeFileSync(p, await renderPdf(html, hf));
  await shell.openPath(p);
  return true;
});
ipcMain.handle('win:fullscreen', (e) => { const w = win(e); w.setFullScreen(!w.isFullScreen()); });
ipcMain.handle('edit:paste', (e) => { e.sender.paste(); });

// ---- Activation (placeholder: any code starting with TEMPLADZ; NOT real protection) ----
const okCode = (c) => /^TEMPLADZ.+/i.test(String(c || '').trim());
ipcMain.handle('lic:status', () => {
  try { return { ok: okCode(fs.readFileSync(licFile(), 'utf8')) }; } catch { return { ok: false }; }
});
ipcMain.handle('lic:activate', (_e, code) => {
  if (!okCode(code)) return { ok: false };
  fs.writeFileSync(licFile(), String(code).trim());
  return { ok: true };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
