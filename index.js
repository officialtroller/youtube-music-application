
const { app, BrowserWindow, globalShortcut, shell, ipcMain } = require('electron');
const DiscordRPC = require('discord-rpc');
const path = require('path');
const fs = require('fs');

const clientId = '1295050706620907611';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

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
        icon: process.platform === 'darwin' ? path.join(__dirname, 'icon.icns') : path.join(__dirname, 'icon.ico'),
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

    globalShortcut.register('F11', () => {
        const isFullScreen = mainWindow.isFullScreen();
        mainWindow.setFullScreen(!isFullScreen);
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
        const title = await mainWindow.webContents.executeJavaScript(`
            webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.title')?.textContent || 'Unknown Title'");
        `);

        const artistdata = await mainWindow.webContents.executeJavaScript(`
            webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.byline')?.textContent || 'Unknown Artist'");
        `);

        const artist = artistdata.split('•')[0].trim().replace(/"/g, '');
        const isPlaying = await mainWindow.webContents.executeJavaScript(`
            webview?.executeJavaScript("!document.querySelector('video').paused");
        `);

        rpc.setActivity({
            details: title,
            state: `By ${artist}`,
            largeImageKey: 'icon_512',
            largeImageText: artist,
            smallImageKey: isPlaying ? "play" : "pause",
            smallImageText: isPlaying ? "Playing" : "Paused"
        }).catch(console.error);
    } catch (error) {
        console.error(error);
    }
}


