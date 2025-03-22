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

ipcMain.on('set-auto-update', (event, enabled) => {
    autoUpdateEnabled = enabled;
    if (autoUpdateEnabled) {
        autoUpdater.checkForUpdates();
    }
});

ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdates();
});

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for updates...');
    console.log('Checking for updates');
});

autoUpdater.on('update-available', info => {
    sendStatusToWindow('Update available. Downloading...', 'yellow');
    autoUpdater.downloadUpdate();
    console.log('Download is there');
});

autoUpdater.on('update-not-available', info => {
    sendStatusToWindow('App is up-to-date.', 'green');
    console.log('Update not there');
});

autoUpdater.on('download-progress', progressObj => {
    sendStatusToWindow(`Downloading Update...${Math.round(progressObj.percent)} %`, 'yellow');
    console.log('Downloading update');
});

autoUpdater.on('update-downloaded', info => {
    sendStatusToWindow('Update downloaded. Will install on restart.', 'green');
    console.log('Update installed');
});

setInterval(() => {
    if (app.isPackaged && autoUpdateEnabled) autoUpdater.checkForUpdates();
}, 60 * 60 * 1000);

function sendStatusToWindow(text, style) {
    if (mainWindow) {
        mainWindow.webContents.send('update-status', text, style);
        console.log('Function triggered!!!!!!!!!!' + text + style);
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
            webviewTag: true,
        },
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

    await mainWindow.webContents.executeJavaScript("const webview = document.querySelector('webview');");

    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });

    ipcMain.on('window-maximize', () => {
        const isFullScreen = mainWindow.isFullScreen();
        mainWindow.setFullScreen(!isFullScreen);
    });

    ipcMain.on('window-close', () => {
        mainWindow.close(), rpc.destroy();
    });
    const registeredShortcuts = {};

    ipcMain.on('set-hotkey', (event, { action, enabled, hotkey }) => {
        if (!enabled) {
            unregisterHotkey(action);
            return;
        }

        if (registeredShortcuts[action]) {
            globalShortcut.unregister(registeredShortcuts[action]);
        }

        const success = globalShortcut.register(hotkey, async () => {
            console.log(`Global shortcut for ${action} triggered: ${hotkey}`);
            switch (action) {
                case 'skip':
                    await mainWindow.webContents.executeJavaScript(`
                        webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.next-button')?.click();");
                    `);
                    break;
                case 'pause':
                    await mainWindow.webContents.executeJavaScript(`
                        webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.play-pause-button')?.click();");
                    `);
                    break;
                case 'previous':
                    await mainWindow.webContents.executeJavaScript(`
                        webview?.executeJavaScript("document.querySelector('ytmusic-player-bar').querySelector('.previous-button')?.click();");
                    `);
                    break;
                default:
                    console.error(`Unknown action: ${action}`);
            }
        });

        if (!success) {
            console.error(`Failed to register global shortcut for ${action}: ${hotkey}`);
        } else {
            console.log(`Global shortcut registered for ${action}: ${hotkey}`);
            registeredShortcuts[action] = hotkey;
        }
    });

    function unregisterHotkey(action) {
        if (registeredShortcuts[action]) {
            globalShortcut.unregister(registeredShortcuts[action]);
            console.log(`Global shortcut unregistered for ${action}: ${registeredShortcuts[action]}`);
            delete registeredShortcuts[action];
        }
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit(), rpc.destroy();
});

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

const REFRESH_INTERVAL = 3000;
let lastActivity = null;

function initDiscord() {
    rpc.on('ready', () => {
        log('Discord RPC connected');
        updatePresence();
        setInterval(updatePresence, REFRESH_INTERVAL);
    });

    rpc.on('disconnected', () => {
        log('Discord RPC disconnected, attempting reconnect...');
        setTimeout(() => rpc.login({ clientId }), 5000);
    });

    rpc.login({ clientId }).catch(error => {
        log(`Discord RPC login error: ${error.message}`);
        setTimeout(() => initDiscord(), 10000);
    });
}

async function getPlayerData() {
    if (!mainWindow?.webContents) {
        throw new Error('Main window not initialized');
    }

    const script = `
        (() => {
            const playerBar = document.querySelector('ytmusic-player-bar');
            const video = document.querySelector('video');
            if (!playerBar || !video) return null;
            
            const title = playerBar.querySelector('.title')?.textContent || 'Unknown Title';
            const byline = playerBar.querySelector('.byline')?.textContent || 'Unknown Artist';
            const [artist, album = 'Unknown Album'] = byline.split('•').map(s => s.trim().replace(/"/g, ''));
            
            return {
                title,
                artist,
                album,
                isPlaying: !video.paused,
                currentTime: video.currentTime,
                imageUrl: playerBar.querySelector('.image')?.getAttribute('src') || 'icon_512'
            };
        })()
    `;

    return await mainWindow.webContents.executeJavaScript(`webview?.executeJavaScript(\`${script}\`)`);
}

async function updatePresence() {
    if (!rpc || !mainWindow) return;

    try {
        const playerData = await getPlayerData();
        if (!playerData) return;

        let newActivity;
        if (playerData.isPlaying) {
            newActivity = {
                details: playerData.title,
                state: `By ${playerData.artist}`,
                largeImageKey: playerData.imageUrl,
                smallImageKey: undefined,
                smallImageText: undefined,
            };
        } else {
            newActivity = {
                details: playerData.title,
                state: `By ${playerData.artist}`,
                largeImageKey: playerData.imageUrl,
                smallImageKey: 'https://raw.githubusercontent.com/officialtroller/youtube-music-application/refs/heads/main/paus.png',
                smallImageText: 'Paused',
            };
        }

        if (JSON.stringify(newActivity) !== JSON.stringify(lastActivity)) {
            await rpc.setActivity(newActivity);
            lastActivity = newActivity;
        }
    } catch (error) {
        log(`RPC update error: ${error.message}`);
    }
}
