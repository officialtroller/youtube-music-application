const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const minimizeButton = document.getElementById('minimize');
    const maximizeButton = document.getElementById('maximize');
    const closeButton = document.getElementById('close');

    minimizeButton.addEventListener('click', () => {
        ipcRenderer.send('window-minimize');
    });

    maximizeButton.addEventListener('click', () => {
        ipcRenderer.send('window-maximize');
    });

    closeButton.addEventListener('click', () => {
        ipcRenderer.send('window-close');
    });

    const webview = document.querySelector('webview');
    const loadingOverlay = document.getElementById('loading-overlay');
    let initialLoadComplete = false;

    webview.addEventListener('page-title-updated', (event) => {
        ipcRenderer.send('page-title-updated', event.title);
    });

    webview.addEventListener('did-start-loading', () => {
        if (!initialLoadComplete) {
            loadingOverlay.style.display = 'flex';
        }
    });

    webview.addEventListener('did-finish-load', () => {
        if (!initialLoadComplete) {
            initialLoadComplete = true;
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                loadingOverlay.style.opacity = '1';
            }, 300);
        }
    });
});