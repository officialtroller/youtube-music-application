const { app, BrowserWindow, globalShortcut, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const DiscordRPC = require('discord-rpc');
const path = require('path');
const fs = require('fs');

const clientId = '1295050706620907611';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let autoUpdateEnabled = false;
let skipKeyEnabled = false;

ipcMain.on('set-auto-update', (event, enabled) => {
    autoUpdateEnabled = enabled;
    if (autoUpdateEnabled) {
        autoUpdater.checkForUpdates();
    }
});

ipcMain.on('set-skip-key', (event, enabled) => {
    skipKeyEnabled = enabled;
    if (skipKeyEnabled) {
        registerSkipKey();
    } else {
        unregisterSkipKey();
    }
});

ipcMain.on('toggle-fullscreen', () => {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
});

function registerSkipKey() {
    globalShortcut.register('Ctrl+Alt+Shift+N', async () => {
        log('Global shortcut Ctrl+Alt+Shift+N triggered.');
        await mainWindow.webContents.executeJavaScript(`webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.next-button')?.click();");`);
    });
}

function unregisterSkipKey() {
    globalShortcut.unregister('Ctrl+Alt+Shift+N');
}

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for updates...');
    console.log("Checking for updates");
});

autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available. Downloading...', "yellow");
    autoUpdater.downloadUpdate();
    console.log("Download is there");
});

autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('App is up-to-date.', "green");
    console.log("Update not there");
});

autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow(`Downloading Update...${Math.round(progressObj.percent)} %`, "yellow");
    console.log("Downloading update");
});

autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded. Will install on restart.', "green");
    console.log("Update installed");
});

setInterval(() => {
    if (app.isPackaged && autoUpdateEnabled) autoUpdater.checkForUpdates();
}, 60 * 60 * 1000);

function sendStatusToWindow(text, style) {
    if (mainWindow) {
        mainWindow.webContents.send('update-status', text, style);
        console.log("Function triggered!!!!!!!!!!" + text + style);
    }
}

let mainWindow;

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function createWindow() {
    log('Creating main window...');
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: true,
        frame: false,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        }
    });
    mainWindow.loadFile('index.html');

    log('Custom layout loaded successfully.');

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    log('Window created and configured successfully.');
    if (app.isPackaged && autoUpdateEnabled) autoUpdater.checkForUpdates();
}

async function initApp() {
    try {
        await createWindow();
        initDiscord();
        log('Application initialized successfully.');
    } catch (error) {
        log(`Error during initialization: ${error.message}`);
    }
}

app.whenReady().then(async () => {
    initApp();

    await mainWindow.webContents.executeJavaScript("const webview = document.querySelector('webview');")

    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });

    ipcMain.on('window-maximize', () => {
        const isFullScreen = mainWindow.isFullScreen();
        mainWindow.setFullScreen(!isFullScreen);
    });

    ipcMain.on('window-close', () => {
        mainWindow.close();
    });
    globalShortcut.register('Ctrl+Alt+Shift+N', async () => {
        log('Global shortcut Ctrl+Alt+Shift+N triggered.');

        await mainWindow.webContents.executeJavaScript(`webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.next-button')?.click();");`)
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function initDiscord() {
    rpc.on('ready', () => {
        log('Discord RPC connected');
        updatePresence();

        setInterval(updatePresence, 1000);
    });
    rpc.login({ clientId }).catch(error => log(`Discord RPC login error: ${error.message}`));
}

async function updatePresence() {
    if (!rpc || !mainWindow) return;

    try {
        const title = await mainWindow.webContents.executeJavaScript(
            `webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.title')?.textContent || 'Unknown Title'");`
        );

        const artistdata = await mainWindow.webContents.executeJavaScript(
            `webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.byline')?.textContent || 'Unknown Artist'");`
        );

        const artist = artistdata.split('•')[0].trim().replace(/"/g, '');
        const isPlaying = await mainWindow.webContents.executeJavaScript(
            `webview?.executeJavaScript("!document.querySelector('video').paused");`
        );

        rpc.setActivity({
            details: title,
            state: `By ${artist}`,
            largeImageKey: 'icon_512',
            largeImageText: artist,
            smallImageKey: isPlaying ? "play2" : "pause2",
            smallImageText: isPlaying ? "Playing" : "Paused"
        }).catch(console.error);
    } catch (error) {
        console.error(error);
    }
}