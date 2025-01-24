const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const translationFilePath = path.join(__dirname, 'translations.json');
let translations = {};
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

    function createSettingsMenu() {
        div = document.createElement('div');
        div.classList.add('settingsmenu');
        Object.assign(div.style, {
            width: `${window.innerWidth / 2}px`,
            height: `${window.innerHeight / 2}px`,
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
        info.textContent = '© official_troller V2.0.0';
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

        const fullinput = document.createElement('div');
        fullinput.classList = 'settingsdiv';

        const inputlabel = document.createElement('span');
        inputlabel.textContent = 'Skip Song';
        Object.assign(inputlabel.style, {
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
            right: '30px',
        });
        hotkeyDisplay.textContent = localStorage.getItem('skip') || 'Click to set hotkey';
        const skipdel = document.createElement('i');
        skipdel.classList = 'fas fa-trash-alt';
        skipdel.style.position = 'absolute';
        skipdel.style.right = '0';
        skipdel.style.cursor = 'pointer';
        skipdel.style.color = 'white';
        skipdel.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
        skipdel.addEventListener('click', () => {
            localStorage.removeItem('skip');
            hotkeyDisplay.textContent = 'Click to set hotkey';
            ipcRenderer.send('set-hotkey', {
                action: 'skip',
                enabled: false,
            });
        });

        let pressedKeys = new Set();

        function formatHotkey(keys) {
            const orderedKeys = Array.from(keys).sort((a, b) => {
                const order = ['Control', 'Alt', 'Shift', 'Meta'];
                return order.indexOf(a) - order.indexOf(b) || a.localeCompare(b);
            });
            return orderedKeys.join('+');
        }

        function setskipkeys(event) {
            event.preventDefault();

            const key = event.key === ' ' ? 'Space' : event.key;
            pressedKeys.add(key === 'Control' ? 'Ctrl' : key);

            hotkeyDisplay.textContent = formatHotkey(pressedKeys);
        }

        function finalizeskipkeys(event) {
            event.preventDefault();

            const hotkey = formatHotkey(pressedKeys);
            localStorage.setItem('skip', hotkey);
            hotkeyDisplay.textContent = hotkey;

            ipcRenderer.send('set-hotkey', {
                action: 'skip',
                enabled: true,
                hotkey: hotkey,
            });

            pressedKeys.clear();
            document.removeEventListener('keydown', setskipkeys);
            document.removeEventListener('keyup', finalizeskipkeys);
        }

        hotkeyDisplay.addEventListener('click', () => {
            hotkeyDisplay.textContent = 'Press keys...';
            pressedKeys.clear();
            document.addEventListener('keydown', setskipkeys);
            document.addEventListener('keyup', finalizeskipkeys);
        });

        fullinput.appendChild(inputlabel);
        fullinput.appendChild(hotkeyDisplay);
        fullinput.appendChild(skipdel);

        const fullpauseinput = document.createElement('div');
        fullpauseinput.classList = 'settingsdiv';

        const pauseinputlabel = document.createElement('span');
        pauseinputlabel.textContent = 'Pause Song';
        Object.assign(pauseinputlabel.style, {
            color: 'white',
            userSelect: 'none',
        });

        const pausehotkeyDisplay = document.createElement('div');
        Object.assign(pausehotkeyDisplay.style, {
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
            right: '30px',
        });
        pausehotkeyDisplay.textContent = localStorage.getItem('pause') || 'Click to set hotkey';
        const pausedel = document.createElement('i');
        pausedel.classList = 'fas fa-trash-alt';
        pausedel.style.position = 'absolute';
        pausedel.style.right = '0';
        pausedel.style.cursor = 'pointer';
        pausedel.style.color = 'white';
        pausedel.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
        pausedel.addEventListener('click', () => {
            localStorage.removeItem('previous');
            prevhotkeyDisplay.textContent = 'Click to set hotkey';
            ipcRenderer.send('set-hotkey', {
                action: 'pause',
                enabled: false,
            });
        });

        let pausedpressedKeys = new Set();

        function setpausekeys(event) {
            event.preventDefault();

            const key = event.key === ' ' ? 'Space' : event.key;
            pausedpressedKeys.add(key === 'Control' ? 'Ctrl' : key);

            pausehotkeyDisplay.textContent = formatHotkey(pausedpressedKeys);
        }

        function finalizepausekeys(event) {
            event.preventDefault();

            const hotkey = formatHotkey(pausedpressedKeys);
            localStorage.setItem('pause', hotkey);
            pausehotkeyDisplay.textContent = hotkey;

            ipcRenderer.send('set-hotkey', {
                action: 'pause',
                enabled: true,
                hotkey: hotkey,
            });

            pausedpressedKeys.clear();
            document.removeEventListener('keydown', setpausekeys);
            document.removeEventListener('keyup', finalizepausekeys);
        }

        pausehotkeyDisplay.addEventListener('click', () => {
            pausehotkeyDisplay.textContent = 'Press keys...';
            pausedpressedKeys.clear();
            document.addEventListener('keydown', setpausekeys);
            document.addEventListener('keyup', finalizepausekeys);
        });

        fullpauseinput.appendChild(pauseinputlabel);
        fullpauseinput.appendChild(pausehotkeyDisplay);
        fullpauseinput.appendChild(pausedel);

        const fullprevinput = document.createElement('div');
        fullprevinput.classList = 'settingsdiv';

        const previnputlabel = document.createElement('span');
        previnputlabel.textContent = 'Previous Song';
        Object.assign(previnputlabel.style, {
            color: 'white',
            userSelect: 'none',
        });

        const prevhotkeyDisplay = document.createElement('div');
        Object.assign(prevhotkeyDisplay.style, {
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
            right: '30px',
        });
        prevhotkeyDisplay.textContent = localStorage.getItem('previous') || 'Click to set hotkey';
        const prevdel = document.createElement('i');
        prevdel.classList = 'fas fa-trash-alt';
        prevdel.style.position = 'absolute';
        prevdel.style.right = '0';
        prevdel.style.cursor = 'pointer';
        prevdel.style.color = 'white';
        prevdel.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
        prevdel.addEventListener('click', () => {
            localStorage.removeItem('previous');
            prevhotkeyDisplay.textContent = 'Click to set hotkey';
            ipcRenderer.send('set-hotkey', {
                action: 'previous',
                enabled: false,
            });
        });

        let prevpressedKeys = new Set();

        function setprevkeys(event) {
            event.preventDefault();

            const key = event.key === ' ' ? 'Space' : event.key;
            prevpressedKeys.add(key === 'Control' ? 'Ctrl' : key);

            prevhotkeyDisplay.textContent = formatHotkey(prevpressedKeys);
        }

        function finalizeprevkeys(event) {
            event.preventDefault();

            const hotkey = formatHotkey(prevpressedKeys);
            localStorage.setItem('previous', hotkey);
            prevhotkeyDisplay.textContent = hotkey;

            ipcRenderer.send('set-hotkey', {
                action: 'previous',
                enabled: true,
                hotkey: hotkey,
            });

            prevpressedKeys.clear();
            document.removeEventListener('keydown', setprevkeys);
            document.removeEventListener('keyup', finalizeprevkeys);
        }

        prevhotkeyDisplay.addEventListener('click', () => {
            prevhotkeyDisplay.textContent = 'Press keys...';
            prevpressedKeys.clear();
            document.addEventListener('keydown', setprevkeys);
            document.addEventListener('keyup', finalizeprevkeys);
        });

        fullprevinput.appendChild(previnputlabel);
        fullprevinput.appendChild(prevhotkeyDisplay);
        fullprevinput.appendChild(prevdel);

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
        languageselect.style.right = '0';
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
        updatebtn.onclick = function () {
            ipcRenderer.send('check-for-updates');
        };
        settingsmenu.appendChild(fullinput);
        settingsmenu.appendChild(fullpauseinput);
        settingsmenu.appendChild(fullprevinput);
        settingsmenu.appendChild(fulllang);
        settingsmenu.appendChild(updatebtn);
        updateUI(localStorage.getItem('lang'));
        function updateUI(lang) {
            langue.textContent = getTranslation('Language', lang);
            header.textContent = getTranslation('Settings', lang);
            autoupdatespan.textContent = getTranslation('Auto-Update', lang);
            inputlabel.textContent = getTranslation('Skip Song', lang);
            pauseinputlabel.textContent = getTranslation('Pause Song', lang);
            previnputlabel.textContent = getTranslation('Previous Song', lang);
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
    document.addEventListener('keydown', event => {
        if (event.key === 'F11') {
            event.preventDefault();
            ipcRenderer.send('window-maximize');
        }
    });
});
