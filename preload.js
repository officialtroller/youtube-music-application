const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const translationFilePath = path.join(__dirname, 'translations.json');
let translations = {};
const FADE_DURATION = 300;
const FADE_STEPS = 30;
try {
    const fileContent = fs.readFileSync(translationFilePath, 'utf-8');
    translations = JSON.parse(fileContent);
    console.log('Translations loaded:', translations);
} catch (error) {
    console.error('Error loading translation file:', error);
}
// let ipcRenderer;
function getTranslation(key, lang) {
    return translations[key]?.[lang] || key;
}
document.addEventListener('DOMContentLoaded', () => {
    const minimizeButton = document.getElementById('minimize');
    const maximizeButton = document.getElementById('maximize');
    const closeButton = document.getElementById('close');
    const settingsbtn = document.getElementById('settings-btn');
    let div = null;

    async function createSettingsMenu() {
        div = document.createElement('div');
        div.classList.add('settingsmenu');

        document.getElementById('content').appendChild(div);
        fadeIn(div);

        const header = document.createElement('h2');
        header.textContent = 'Settings';
        header.classList.add('settings-header');
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
        const version = await ipcRenderer.invoke('get-app-version');
        info.textContent = '© official_troller V' + version;
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
        settingsmenu.classList.add('menucontent');
        div.appendChild(settingsmenu);
        const fullautoupdate = document.createElement('div');
        fullautoupdate.classList = 'settingsdiv';
        const autoupdatelabel = document.createElement('label');
        autoupdatelabel.classList.add('switch');
        const autoupdatespan = document.createElement('span');
        autoupdatespan.textContent = 'Auto-Update';
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

        function createHotkeyInput(action, labelText) {
            const container = document.createElement('div');
            container.classList = 'settingsdiv';

            const label = document.createElement('span');
            label.textContent = labelText;
            Object.assign(label.style, {
                color: 'white',
                userSelect: 'none',
            });

            const hotkeyDisplay = document.createElement('div');
            Object.assign(hotkeyDisplay.style, {
                display: 'inline-block',
                padding: '5px 10px',
                marginLeft: '10px',
                backgroundColor: 'white',
                color: 'black',
                borderRadius: '5px',
                border: '1px solid #ccc',
                cursor: 'pointer',
                userSelect: 'none',
                position: 'absolute',
                right: '40px',
            });
            hotkeyDisplay.textContent = localStorage.getItem(action) || 'Click to set hotkey';

            const deleteBtn = document.createElement('i');
            deleteBtn.classList = 'fas fa-trash-alt';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.right = '10px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.color = 'white';
            deleteBtn.addEventListener('click', () => {
                localStorage.removeItem(action);
                hotkeyDisplay.textContent = 'Click to set hotkey';
                ipcRenderer.send('set-hotkey', { action, enabled: false });
            });

            let pressedKeys = new Set();

            function formatHotkey(keys) {
                const orderedKeys = Array.from(keys).sort((a, b) => {
                    const order = ['Control', 'Alt', 'Shift', 'Meta'];
                    return order.indexOf(a) - order.indexOf(b) || a.localeCompare(b);
                });
                return orderedKeys.join('+');
            }

            function setKeys(event) {
                event.preventDefault();
                const key = event.key === ' ' ? 'Space' : event.key;
                pressedKeys.add(key === 'Control' ? 'Ctrl' : key);
                hotkeyDisplay.textContent = formatHotkey(pressedKeys);
            }

            function finalizeKeys(event) {
                event.preventDefault();
                const hotkey = formatHotkey(pressedKeys);
                localStorage.setItem(action, hotkey);
                hotkeyDisplay.textContent = hotkey;
                ipcRenderer.send('set-hotkey', { action, enabled: true, hotkey });
                pressedKeys.clear();
                document.removeEventListener('keydown', setKeys);
                document.removeEventListener('keyup', finalizeKeys);
            }

            hotkeyDisplay.addEventListener('click', () => {
                hotkeyDisplay.textContent = 'Press keys...';
                pressedKeys.clear();
                document.addEventListener('keydown', setKeys);
                document.addEventListener('keyup', finalizeKeys);
            });

            container.appendChild(label);
            container.appendChild(hotkeyDisplay);
            container.appendChild(deleteBtn);

            return { container, label };
        }
        const skip_SongELM = createHotkeyInput('skip', 'Skip Song');
        const pause_SongELM = createHotkeyInput('pause', 'Pause Song');
        const prev_SongELM = createHotkeyInput('previous', 'Previous Song');
        settingsmenu.appendChild(skip_SongELM.container);
        settingsmenu.appendChild(pause_SongELM.container);
        settingsmenu.appendChild(prev_SongELM.container);
        const fulllang = document.createElement('div');
        fulllang.classList = 'settingsdiv';

        const langue = document.createElement('span');
        langue.textContent = 'Language';
        Object.assign(langue.style, {
            color: 'white',
            userSelect: 'none',
        });

        fulllang.appendChild(langue);
        const disclaimer = document.createElement('i');
        disclaimer.id = 'disclaimer';
        disclaimer.textContent = 'i';
        disclaimer.style.position = 'absolute';
        disclaimer.style.left = '70px';
        fulllang.appendChild(disclaimer);

        const languageselect = document.createElement('select');
        languageselect.style.position = 'absolute';
        languageselect.style.right = '10px';
        const languages = [
            { value: 'en', text: 'English - English' },
            { value: 'ru', text: 'Русский - Russian' },
            { value: 'zh', text: '中文 - Chinese' },
            { value: 'de', text: 'Deutsch - German' },
            { value: 'es', text: 'Español - Spanish' },
            { value: 'fr', text: 'Français - French' },
        ];

        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.value;
            option.textContent = lang.text;
            languageselect.appendChild(option);
        });
        const savedLanguage = localStorage.getItem('lang');
        if (savedLanguage) {
            languageselect.value = savedLanguage;
        }

        languageselect.addEventListener('change', event => {
            const selectedLang = event.target.value;
            localStorage.setItem('lang', selectedLang);
            updateUI(selectedLang);
        });

        Object.assign(languageselect.style, {
            padding: '5px',
            marginLeft: '10px',
            backgroundColor: 'white',
            color: 'black',
            borderRadius: '5px',
            border: '1px solid #ccc',
        });

        fulllang.appendChild(languageselect);
        settingsmenu.appendChild(fulllang);
        var updatebtn = document.createElement('button');
        updatebtn.textContent = 'Check for Updates';
        updatebtn.style.padding = '6px 10px';
        updatebtn.style.fontSize = 'unset';
        updatebtn.style.cursor = 'pointer';
        updatebtn.style.textAlign = 'center';
        updatebtn.style.background = 'radial-gradient(ellipse at center,hsla(200,50%,0%,1) 0,hsla(0, 0.00%, 82.00%, 0.50) 150%)';
        updatebtn.style.boxShadow = '0 0 6px hsla(0,0%,60%,1)';
        updatebtn.style.textShadow = '0 0 7px hsla(0,0%,60%,1)';
        updatebtn.style.color = 'hsla(0,0%,90%,.8)';
        updatebtn.style.fontFamily = 'Play, Verdana';
        updatebtn.style.border = '0';
        updatebtn.style.borderRadius = '20px';
        updatebtn.style.left = '6px';
        updatebtn.style.position = 'fixed';
        updatebtn.onclick = function () {
            ipcRenderer.send('check-for-updates');
        };
        settingsmenu.appendChild(updatebtn);
        updateUI(localStorage.getItem('lang'));
        function updateUI(lang) {
            langue.textContent = getTranslation('Language', lang);
            header.textContent = getTranslation('Settings', lang);
            autoupdatespan.textContent = getTranslation('Auto-Update', lang);
            skip_SongELM.label.textContent = getTranslation('Skip Song', lang);
            pause_SongELM.label.textContent = getTranslation('Pause Song', lang);
            prev_SongELM.label.textContent = getTranslation('Previous Song', lang);
        }
        function fadeIn(element) {
            let opacity = 0;
            const interval = setInterval(() => {
                opacity += 0.1;
                element.style.opacity = opacity;
                if (opacity >= 1) clearInterval(interval);
            }, FADE_STEPS);
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
            }, FADE_STEPS);
        }
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
    webview.addEventListener('console-message', e => {
        switch (e.message) {
            case 'button_3_down':
                ipcRenderer.send('goBack');
                break;
            case 'button_4_down':
                ipcRenderer.send('goForward');
                break;
        }
    });
    const loadingOverlay = document.getElementById('loading-overlay');
    let initialLoadComplete = false;

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
            }, FADE_DURATION);
        }
        const pauseHotkey = localStorage.getItem('pause');
        const skipHotkey = localStorage.getItem('skip');
        const previousHotkey = localStorage.getItem('previous');

        if (pauseHotkey) {
            ipcRenderer.send('set-hotkey', { action: 'pause', enabled: true, hotkey: pauseHotkey });
            console.log('Set pause hotkey:', pauseHotkey);
        }
        if (skipHotkey) {
            ipcRenderer.send('set-hotkey', { action: 'skip', enabled: true, hotkey: skipHotkey });
            console.log('Set skip hotkey:', skipHotkey);
        }
        if (previousHotkey) {
            ipcRenderer.send('set-hotkey', { action: 'previous', enabled: true, hotkey: previousHotkey });
            console.log('Set previous hotkey:', previousHotkey);
        }
    });

    const updateStatus = document.getElementById('update-status');
    let timeoutId = null;

    ipcRenderer.on('update-status', (event, text, color) => {
        updateStatus.textContent = text;
        updateStatus.style.display = 'block';
        updateStatus.style.borderRight = `2px solid ${color}`;

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            updateStatus.style.opacity = '0';
            setTimeout(() => {
                updateStatus.style.display = 'none';
                updateStatus.style.opacity = '1';
            }, 300);
        }, 5000);
    });
    ipcRenderer.send('set-auto-update', localStorage.getItem('autoUpdate') === 'true');
    document.addEventListener('keydown', event => {
        if (event.key === 'F11') {
            event.preventDefault();
            ipcRenderer.send('window-fullscreen');
        }
    });
    document.addEventListener('mousedown', event => {
        console.log('Mouse button clicked:', event.button);
        if (event.button === 4) {
            console.log('Back button clicked');
            event.preventDefault();
            ipcRenderer.send('goForward');
        }
        if (event.button === 3) {
            console.log('Forward button clicked');
            event.preventDefault();
            ipcRenderer.send('goBack');
        }
    });
});
