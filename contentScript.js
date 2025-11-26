(function injectPageScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('pageScript.js');
    script.onload = () => {
        script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
})();

chrome.storage.sync.get('soundMode', (data) => {
    const mode = data.soundMode || 'custom1';
    setTimeout(() => {
        window.postMessage(
            {
                type: 'CHESS_SOUND_MODE',
                mode
            },
            '*'
        );
    }, 200);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'SET_SOUND_MODE') {
        window.postMessage(
            {
                type: 'CHESS_SOUND_MODE',
                mode: message.mode
            },
            '*'
        );
    }
});
