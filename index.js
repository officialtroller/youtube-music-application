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

let lastActivity = null;
let lastPlayerState = null;
let presenceUpdateTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const REFRESH_INTERVAL = 1000;
const RECONNECT_DELAY = 5000;
const IMAGE_CACHE = new Map();

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
            
            const artist = byline.split('•')[0]?.trim().replace(/["']/g, '') || 'Unknown Artist';

            const durationMs = Math.floor((video.duration || 0) * 1000);
            const positionMs = Math.floor((video.currentTime || 0) * 1000);
            const isPlaying = !video.paused && !video.ended;

            let imageUrl = playerBar.querySelector('.image')?.getAttribute('src') || 'icon_512';
            if (imageUrl.startsWith('data:')) {
                imageUrl = 'icon_512';
            } else if (imageUrl.includes('=w')) {
                imageUrl = imageUrl.replace(/=w\d+/, '=w512');
            }

            return {
                title: title.trim(),
                artist: artist.trim(),
                isPlaying,
                positionMs,
                durationMs,
                imageUrl,
                playbackRate: video.playbackRate || 1.0,
                isEnded: video.ended
            };
        })()
    `;

    return await mainWindow.webContents.executeJavaScript(`webview?.executeJavaScript(\`${script}\`)`);
}

function calculateTimestamps(playerData) {
    if (!playerData.isPlaying || playerData.durationMs <= 0) {
        return { startTimestamp: undefined, endTimestamp: undefined };
    }

    const now = Date.now();
    const remainingMs = playerData.durationMs - playerData.positionMs;

    const startTimestamp = now - playerData.positionMs;

    const endTimestamp = now + remainingMs;

    return { startTimestamp, endTimestamp };
}

function shouldUpdatePresence(newData, oldData) {
    if (!oldData) return true;

    return (
        newData.title !== oldData.title ||
        newData.artist !== oldData.artist ||
        newData.album !== oldData.album ||
        newData.isPlaying !== oldData.isPlaying ||
        newData.imageUrl !== oldData.imageUrl ||
        Math.abs(newData.positionMs - oldData.positionMs) > 2000
    );
}

async function processImageUrl(imageUrl) {
    if (IMAGE_CACHE.has(imageUrl)) {
        return IMAGE_CACHE.get(imageUrl);
    }

    let processedUrl = imageUrl;

    if (imageUrl.includes('googleusercontent.com') || imageUrl.includes('ytimg.com')) {
        processedUrl = imageUrl.split('=')[0] + '=s512-c-fcrop64=1,00005a57ffffa5a8-k-c0x00ffffff-no-nd-rj';
    }

    IMAGE_CACHE.set(imageUrl, processedUrl);

    if (IMAGE_CACHE.size > 50) {
        const firstKey = IMAGE_CACHE.keys().next().value;
        IMAGE_CACHE.delete(firstKey);
    }

    return processedUrl;
}

async function updatePresence() {
    if (!rpc || !mainWindow) return;

    try {
        const playerData = await getPlayerData();
        if (!playerData) {
            if (lastActivity) {
                await rpc.clearActivity();
                lastActivity = null;
                lastPlayerState = null;
            }
            return;
        }

        if (!shouldUpdatePresence(playerData, lastPlayerState)) {
            return;
        }

        const { startTimestamp, endTimestamp } = calculateTimestamps(playerData);
        const processedImageUrl = await processImageUrl(playerData.imageUrl);

        let newActivity = {
            details: playerData.title,
            state: `by ${playerData.artist}`,
            largeImageKey: processedImageUrl,
            //largeImageText: playerData.artist,
            type: 2,
        };

        if (playerData.isPlaying && !playerData.isEnded) {
            newActivity.startTimestamp = startTimestamp;
            newActivity.endTimestamp = endTimestamp;
            newActivity.smallImageKey = undefined;
            newActivity.smallImageText = undefined;
        } else {
            newActivity.smallImageKey = 'https://raw.githubusercontent.com/officialtroller/youtube-music-application/refs/heads/main/paus.png';
            newActivity.smallImageText = playerData.isEnded ? 'Ended' : 'Paused';
        }

        const activityChanged = JSON.stringify(newActivity) !== JSON.stringify(lastActivity);

        if (activityChanged) {
            await rpc.setActivity(newActivity);
            lastActivity = { ...newActivity };
            log(`RPC updated: ${playerData.title} by ${playerData.artist} (${playerData.isPlaying ? 'playing' : 'paused'})`);
        }

        lastPlayerState = { ...playerData };
        reconnectAttempts = 0;
    } catch (error) {
        log(`RPC update error: ${error.message}`);

        if (error.message.includes('RPC') || error.message.includes('connection')) {
            handleDisconnection();
        }
    }
}

function handleDisconnection() {
    if (presenceUpdateTimer) {
        clearInterval(presenceUpdateTimer);
        presenceUpdateTimer = null;
    }

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        log(`Discord RPC disconnected, attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);

        setTimeout(() => {
            initDiscord();
        }, RECONNECT_DELAY * reconnectAttempts);
    } else {
        log('Max reconnection attempts reached. Stopping Discord RPC.');
    }
}

function initDiscord() {
    if (presenceUpdateTimer) {
        clearInterval(presenceUpdateTimer);
        presenceUpdateTimer = null;
    }

    rpc.on('ready', () => {
        log('Discord RPC connected successfully');
        reconnectAttempts = 0;

        updatePresence();

        presenceUpdateTimer = setInterval(updatePresence, REFRESH_INTERVAL);
    });

    rpc.on('disconnected', () => {
        log('Discord RPC disconnected');
        handleDisconnection();
    });

    rpc.login({ clientId }).catch(error => {
        log(`Discord RPC login error: ${error.message}`);
        handleDisconnection();
    });
}

function cleanupDiscordRPC() {
    if (presenceUpdateTimer) {
        clearInterval(presenceUpdateTimer);
        presenceUpdateTimer = null;
    }

    if (rpc) {
        rpc.clearActivity().catch(() => {});
        rpc.destroy().catch(() => {});
    }

    IMAGE_CACHE.clear();
    log('Discord RPC cleaned up');
}

function log(message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ${message}`);
}
