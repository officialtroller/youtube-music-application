const { ipcRenderer } = require('electron');
document.addEventListener('DOMContentLoaded', () => {
    const minimizeButton = document.getElementById('minimize');
    const maximizeButton = document.getElementById('maximize');
    const closeButton = document.getElementById('close');
    const settingsbtn = document.getElementById('settings-btn');
    let div = null;

    function createSettingsMenu() {
        div = document.createElement('div');
        div.classList.add('settingsmenu');
        Object.assign(div.style, {
            position: 'fixed',
            width: `${window.innerWidth / 2}px`,
            height: `${window.innerHeight / 2}px`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '20000',
            backgroundColor: '#070707ed',
            backdropFilter: 'blur(5px)',
            webkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'center',
            border: '1px solid #B3B3B3',
            borderRadius: '7px',
            boxShadow: '0 0 10px 0 white',
            opacity: '0',
        });

        document.getElementById('content').appendChild(div);
        fadeIn(div);

        const header = document.createElement('h2');
        header.textContent = 'Settings';
        Object.assign(header.style, {
            color: '#B3B3B3',
            fontSize: '20px',
            userSelect: 'none',
        });
        div.appendChild(header);

        const closebtn = document.createElement('button');
        closebtn.textContent = 'X';
        Object.assign(closebtn.style, {
            position: 'absolute',
            right: '0',
            top: '0',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#B3B3B3',
            fontSize: '20px',
            padding: '10px',
            cursor: 'pointer',
            userSelect: 'none',
        });
        closebtn.addEventListener('click', () => fadeOutAndRemove(div));
        div.appendChild(closebtn);

        const info = document.createElement('p');
        info.textContent = '© official_troller V1.3.1';
        Object.assign(info.style, {
            position: 'absolute',
            color: '#B3B3B3',
            fontSize: '15px',
            userSelect: 'none',
            bottom: '0',
            margin: '7px',
        });
        div.appendChild(info);

        const settingsmenu = document.createElement('div');
        settingsmenu.classList.add('settingsmenu');
        Object.assign(settingsmenu.style, {
            position: 'absolute',
            width: '40%',
            height: '60%',
            top: '50%',
            transform: 'translateY(-50%)',
        });
        div.appendChild(settingsmenu);
        const fullautoupdate = document.createElement('div');
        fullautoupdate.style.margin = '25px';
        const autoupdatelabel = document.createElement('label');
        autoupdatelabel.classList.add('switch');
        const autoupdatespan = document.createElement('span');
        autoupdatespan.textContent = 'Auto Update';
        Object.assign(autoupdatespan.style, {
            color: 'white',
            left: '0',
            userSelect: 'none',
        });
        fullautoupdate.appendChild(autoupdatespan);
        const autoupdateinput = document.createElement('input');
        autoupdateinput.type = 'checkbox';
        autoupdateinput.checked = localStorage.getItem('autoUpdate') === 'true';
        autoupdateinput.addEventListener('change', () => {
            localStorage.setItem('autoUpdate', autoupdateinput.checked);
            ipcRenderer.send('set-auto-update', autoupdateinput.checked);
        });
        autoupdatelabel.appendChild(autoupdateinput);
        const autoupdatediv = document.createElement('div');
        autoupdatediv.classList.add('slider');
        autoupdatelabel.appendChild(autoupdatediv);
        fullautoupdate.appendChild(autoupdatelabel);
        settingsmenu.appendChild(fullautoupdate);

        const fullinput = document.createElement('div');
        fullinput.style.margin = '25px';
        const inputlabel = document.createElement('label');
        inputlabel.classList.add('switch');
        const inputspan = document.createElement('span');
        inputspan.textContent = 'Ctrl+Alt+Shift+N to skip';
        Object.assign(inputspan.style, {
            color: 'white',
            left: '0',
            userSelect: 'none',
        });
        fullinput.appendChild(inputspan);
        const inputinput = document.createElement('input');
        inputinput.type = 'checkbox';
        inputinput.checked = localStorage.getItem('skipKey') === 'true';
        inputinput.addEventListener('change', () => {
            localStorage.setItem('skipKey', inputinput.checked);
            ipcRenderer.send('set-skip-key', inputinput.checked);
        });
        inputlabel.appendChild(inputinput);
        const inputdiv = document.createElement('div');
        inputdiv.classList.add('slider');
        inputlabel.appendChild(inputdiv);
        fullinput.appendChild(inputlabel);
        settingsmenu.appendChild(fullinput);
    }

    function fadeIn(element) {
        let opacity = 0;
        const interval = setInterval(() => {
            opacity += 0.1;
            element.style.opacity = opacity;
            if (opacity >= 1) clearInterval(interval);
        }, 30);
    }

    function fadeOutAndRemove(element) {
        let opacity = 1;
        const interval = setInterval(() => {
            opacity -= 0.1;
            element.style.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(interval);
                element.remove();
                div = null;
            }
        }, 30);
    }

    settingsbtn.addEventListener('click', () => {
        if (!div) createSettingsMenu();
    });

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

    webview.addEventListener('page-title-updated', event => {
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

    const updateStatus = document.getElementById('update-status');
    ipcRenderer.on('update-status', (event, text, color) => {
        updateStatus.textContent = text;
        updateStatus.style.display = 'block';
        updateStatus.style.borderRight = `2px solid ${color}`;

        setTimeout(() => {
            updateStatus.style.opacity = '0';
            setTimeout(() => {
                updateStatus.style.display = 'none';
                updateStatus.style.opacity = '1';
            }, 300);
        }, 5000);
    });
    ipcRenderer.send('set-auto-update', localStorage.getItem('autoUpdate') === 'true');
    ipcRenderer.send('set-skip-key', localStorage.getItem('skipKey') === 'true');
    document.addEventListener('keydown', event => {
        if (event.key === 'F11') {
            event.preventDefault();
            ipcRenderer.send('window-maximize');
        }
    });
});
