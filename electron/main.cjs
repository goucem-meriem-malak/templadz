const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { verifyCode } = require('./license.cjs');

const isDev = process.argv.includes('--dev');
const tplDir = () => path.join(app.getPath('userData'), 'templates');
const licFile = () => path.join(app.getPath('userData'), 'license.txt');
const ID_RE = /^[a-f0-9-]{36}$/;
let batchDir = null; // only folder the renderer may write PDFs into (chosen via dialog)

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, backgroundColor: '#f8f9fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  if (isDev) win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// ---- Templates (local JSON files) ----
const tplPath = (id) => {
  if (!ID_RE.test(id)) throw new Error('bad id');
  return path.join(tplDir(), id + '.json');
};
const validTpl = (t) => t && typeof t.name === 'string' && t.doc && t.doc.type === 'doc';

ipcMain.handle('tpl:list', () => {
  fs.mkdirSync(tplDir(), { recursive: true });
  return fs.readdirSync(tplDir()).filter((f) => f.endsWith('.json')).map((f) => {
    try {
      const t = JSON.parse(fs.readFileSync(path.join(tplDir(), f), 'utf8'));
      return { id: f.slice(0, -5), name: t.name, updated: fs.statSync(path.join(tplDir(), f)).mtimeMs };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => b.updated - a.updated);
});
ipcMain.handle('tpl:load', (_e, id) => JSON.parse(fs.readFileSync(tplPath(id), 'utf8')));
ipcMain.handle('tpl:save', (_e, t) => {
  if (!validTpl(t)) throw new Error('invalid template');
  fs.mkdirSync(tplDir(), { recursive: true });
  const id = t.id && ID_RE.test(t.id) ? t.id : crypto.randomUUID();
  fs.writeFileSync(tplPath(id), JSON.stringify({ name: t.name, doc: t.doc }));
  return id;
});
ipcMain.handle('tpl:delete', (_e, id) => { fs.rmSync(tplPath(id), { force: true }); });

// ---- Sharing (.tpz = JSON package) ----
ipcMain.handle('tpl:export', async (e, id) => {
  const t = JSON.parse(fs.readFileSync(tplPath(id), 'utf8'));
  const { filePath, canceled } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    defaultPath: t.name.replace(/[\\/:*?"<>|]/g, '_') + '.tpz', filters: [{ name: 'Templadz', extensions: ['tpz'] }],
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, JSON.stringify({ format: 'templadz', v: 1, name: t.name, doc: t.doc }));
  shell.showItemInFolder(filePath);
  shell.openExternal('mailto:?subject=' + encodeURIComponent(t.name));
  return filePath;
});
ipcMain.handle('tpl:import', async (e) => {
  const { filePaths, canceled } = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    filters: [{ name: 'Templadz', extensions: ['tpz'] }], properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return null;
  const pkg = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  if (pkg.format !== 'templadz' || !validTpl(pkg)) throw new Error('invalid package');
  const id = crypto.randomUUID();
  fs.mkdirSync(tplDir(), { recursive: true });
  fs.writeFileSync(tplPath(id), JSON.stringify({ name: pkg.name, doc: pkg.doc }));
  return id;
});

// ---- PDF (hidden Chromium window, JS disabled) ----
async function renderPdf(html) {
  const tmp = path.join(app.getPath('temp'), 'templadz-' + crypto.randomUUID() + '.html');
  fs.writeFileSync(tmp, html);
  const w = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true, contextIsolation: true } });
  try {
    await w.loadFile(tmp);
    return await w.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
  } finally { w.destroy(); fs.rmSync(tmp, { force: true }); }
}
ipcMain.handle('pdf:save', async (e, html) => {
  const { filePath, canceled } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    defaultPath: 'document.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, await renderPdf(html));
  return filePath;
});
ipcMain.handle('csv:pick', async (e) => {
  const { filePaths, canceled } = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    filters: [{ name: 'CSV', extensions: ['csv'] }], properties: ['openFile'],
  });
  return canceled || !filePaths[0] ? null : fs.readFileSync(filePaths[0], 'utf8');
});
ipcMain.handle('dir:pick', async (e) => {
  const { filePaths, canceled } = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    properties: ['openDirectory', 'createDirectory'],
  });
  batchDir = canceled || !filePaths[0] ? null : filePaths[0];
  return batchDir;
});
ipcMain.handle('pdf:write', async (_e, name, html) => {
  if (!batchDir) throw new Error('no folder chosen');
  const safe = path.basename(String(name)).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'document';
  fs.writeFileSync(path.join(batchDir, safe + '.pdf'), await renderPdf(html));
  return true;
});

// ---- License ----
ipcMain.handle('lic:status', () => {
  try { return verifyCode(fs.readFileSync(licFile(), 'utf8')); }
  catch { return { ok: false, reason: 'none' }; }
});
ipcMain.handle('lic:activate', (_e, code) => {
  const r = verifyCode(code);
  if (r.ok) fs.writeFileSync(licFile(), String(code).trim());
  return r;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
