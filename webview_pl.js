window.addEventListener('mousedown', event => {
    if (event.button === 3) {
        event.preventDefault();
        console.log('button_3_down');
    } else if (event.button === 4) {
        event.preventDefault();
        console.log('button_4_down');
    }
});
