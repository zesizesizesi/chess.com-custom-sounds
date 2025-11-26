(function () {
  'use strict';

  const BASE_URLS = {
    fast: 'https://zesizesizesi.github.io/chess.com-custom-sounds/sounds/fast',
    lichess: 'https://zesizesizesi.github.io/chess.com-custom-sounds/sounds/lichess'
  };

  let currentMode = 'fast';

  const originalUrls = {};

  const SOUND_KEYS = [
    'move-self',
    'move-check',
    'move-opponent',
    'capture',
    'castle',
    'promote',
    'notify',
    'tenseconds',
    'illegal',
    'premove',
    'game-start',
    'game-end'
  ];

  const PACK_FILE_MAP = {
    fast: {
      'move-self': 'move-self.mp3',
      'move-check': 'move-check.mp3',
      'move-opponent': 'move-opponent.mp3',
      'capture': 'capture.mp3',
      'castle': 'castle.mp3',
      'promote': 'promote.mp3',
      'notify': 'notify.mp3',
      'tenseconds': 'tenseconds.mp3',
      'illegal': 'illegal.mp3',
      'premove': 'premove.mp3',
      'game-start': 'game-start.mp3',
      'game-end': 'game-end.mp3'
    },

    lichess: {
      'move-self': 'move.mp3',
      'move-check': 'move.mp3',
      'move-opponent': 'move.mp3',
      'castle': 'move.mp3',
      'premove': 'move.mp3',
      'capture': 'capture.mp3',
      'promote': 'capture.mp3',
      'illegal': 'capture.mp3',
      'notify': 'game_start.mp3',
      'game-start': 'game_start.mp3',
      'game-end': 'game_start.mp3',
      'tenseconds': 'tenseconds.mp3'
    }
  };

  function isSoundUrl(url) {
    if (typeof url !== 'string') return false;
    if (!/sound(s)?/i.test(url)) return false;
    if (!/\.(mp3|ogg|webm)(\?|$)/i.test(url)) return false;
    return SOUND_KEYS.some(key => url.includes(key));
  }

  function getKeyFromUrl(url) {
    if (typeof url !== 'string') return null;
    return SOUND_KEYS.find(key => url.includes(key)) || null;
  }

  function getReplacementUrl(originalUrl) {
    if (!isSoundUrl(originalUrl)) return originalUrl;

    const key = getKeyFromUrl(originalUrl);
    if (!key) return originalUrl;

    if (currentMode === 'default') {
      return originalUrl;
    }

    const baseUrl = BASE_URLS[currentMode];
    const packMap = PACK_FILE_MAP[currentMode];
    if (!baseUrl || !packMap) return originalUrl;

    const fileName = packMap[key];
    if (!fileName) return originalUrl;

    if (!originalUrls[key]) originalUrls[key] = originalUrl;

    return `${baseUrl}/${fileName}`;
  }

  function restoreDefaultSounds() {
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach(el => {
      try {
        if (!el.src) return;
        const key = getKeyFromUrl(el.src);
        if (!key) return;
        const original = originalUrls[key];
        if (original) el.src = original;
      } catch (e) {
      }
    });
  }

  function handleModeChange(newMode) {
    if (newMode !== 'default' && newMode !== 'fast' && newMode !== 'lichess') return;
    const prev = currentMode;
    currentMode = newMode;
    if (prev !== 'default' && newMode === 'default') restoreDefaultSounds();
  }

  const audioBufferKeyMap = new WeakMap();

  function makeSilentAudioBuffer(audioContext) {
    const sampleRate = audioContext.sampleRate || 44100;
    return audioContext.createBuffer(1, 1, sampleRate);
  }

  (function interceptFetchAndTag() {
    if (!window.fetch) return;
    const originalFetch = window.fetch;

    window.fetch = function (resource, init) {
      try {
        if (typeof resource === 'string') {
          const originalResource = resource;
          const shouldTag = isSoundUrl(originalResource);
          const urlKey = shouldTag ? getKeyFromUrl(originalResource) : null;

          const maybeReplaced = getReplacementUrl(originalResource);

          return originalFetch.call(this, maybeReplaced, init).then(response => {
            if (shouldTag && response && typeof response.arrayBuffer === 'function') {
              try {
                const origArrayBuffer = response.arrayBuffer.bind(response);
                response.arrayBuffer = function () {
                  return origArrayBuffer().then(buf => {
                    try {
                      if (buf && urlKey) {
                        audioBufferKeyMap.set(buf, urlKey);
                      }
                    } catch (e) {
                    }
                    return buf;
                  });
                };
              } catch (e) {
              }
            }
            return response;
          });
        }
      } catch (e) {
      }
      return originalFetch.call(this, resource, init);
    };
  })();

  (function interceptXHRandTag() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      try {
        this.__chess_original_url = (typeof url === 'string') ? url : null;
        if (typeof url === 'string') {
          const replaced = getReplacementUrl(url);
          this.__chess_sound_key = getKeyFromUrl(url);
          return originalOpen.call(this, method, replaced, ...rest);
        }
      } catch (e) {
      }
      return originalOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (body) {
      try {
        const trackKey = this.__chess_sound_key || null;
        if (trackKey) {
          const origOnload = this.onload;
          this.onload = function () {
            try {
              if (this.responseType === 'arraybuffer' && this.response instanceof ArrayBuffer) {
                try {
                  audioBufferKeyMap.set(this.response, trackKey);
                } catch (e) { }
              }
            } catch (e) { }

            if (typeof origOnload === 'function') {
              try { origOnload.apply(this, arguments); } catch (e) { }
            }
          };
        }
      } catch (e) {
      }
      return originalSend.call(this, body);
    };
  })();

  (function patchDecodeAudioData() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const originalDecode = AC.prototype.decodeAudioData;

    AC.prototype.decodeAudioData = function (arrayBuffer, successCallback, errorCallback) {
      try {
        const key = audioBufferKeyMap.get(arrayBuffer);
        if (key === 'premove' && currentMode === 'lichess') {
          const silent = makeSilentAudioBuffer(this);
          if (typeof successCallback === 'function') {
            try { successCallback(silent); } catch (e) { }
            return Promise.resolve(silent);
          } else {
            return Promise.resolve(silent);
          }
        }
      } catch (e) {
      }

      try {
        return originalDecode.call(this, arrayBuffer, successCallback, errorCallback);
      } catch (e) {
        return new Promise((resolve, reject) => {
          try {
            originalDecode.call(this, arrayBuffer, resolve, reject);
          } catch (err) {
            reject(err);
          }
        });
      }
    };
  })();

  (function interceptMediaPlay() {
    const originalPlay = HTMLMediaElement.prototype.play;

    HTMLMediaElement.prototype.play = function (...args) {
      try {
        if (this.src && isSoundUrl(this.src)) {
          const newSrc = getReplacementUrl(this.src);
          if (newSrc !== this.src) {
            try { this.src = newSrc; } catch (e) {  }
          }
        }
      } catch (e) {
      }
      return originalPlay.apply(this, args);
    };
  })();

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== 'CHESS_SOUND_MODE') return;
    try { handleModeChange(data.mode); } catch (e) {}
  });

  try {
    console.debug('[ChessCustomSounds] pageScript injected, currentMode=', currentMode);
  } catch (e) {}

})();
