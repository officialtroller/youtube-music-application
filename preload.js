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
    webview.addEventListener('page-title-updated', (event) => {
        ipcRenderer.send('page-title-updated', event.title);
    });
});