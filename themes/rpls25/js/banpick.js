

/* ===================== MOTION HERO MODULE ===================== */
const MotionHero = (() => {
    const _blobCache = new Map();
    let _sessionKey = null;
    let _isEnabled = false;
    let _initialized = false;
    let _keyFetchPromise = null;

    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }

    async function init(enabled) {
        if (_initialized) return;
        _isEnabled = enabled;
        _initialized = true;
        if (enabled) await _fetchSessionKey();
    }

    async function _fetchSessionKey() {
        if (_keyFetchPromise) return _keyFetchPromise;
        _keyFetchPromise = (async () => {
            try {
                const token = localStorage.getItem('authToken') || '';
                const res = await fetch('/api/motion-hero/session-key', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    _sessionKey = data.key;
                } else {
                    _isEnabled = false;
                }
            } catch (e) {
                _isEnabled = false;
            } finally {
                _keyFetchPromise = null;
            }
        })();
        return _keyFetchPromise;
    }

    async function loadHeroVideo(heroName) {
        if (!_isEnabled || !heroName) return null;
        if (!_sessionKey) { await _fetchSessionKey(); if (!_sessionKey) return null; }
        if (_blobCache.has(heroName)) return _blobCache.get(heroName).blobUrl;

        try {
            const token = localStorage.getItem('authToken') || '';
            const res = await fetch(`/api/motion-hero/stream/${encodeURIComponent(heroName)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;

            const encryptedData = await res.arrayBuffer();
            if (encryptedData.byteLength < 29) return null;

            const iv = new Uint8Array(encryptedData, 0, 12);
            const authTag = new Uint8Array(encryptedData, 12, 16);
            const ciphertext = new Uint8Array(encryptedData, 28);
            const combined = new Uint8Array(ciphertext.length + authTag.length);
            combined.set(ciphertext, 0);
            combined.set(authTag, ciphertext.length);

            const keyBytes = hexToBytes(_sessionKey);
            const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
            const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, cryptoKey, combined.buffer);

            const blob = new Blob([decrypted], { type: 'video/mp4' });
            const blobUrl = URL.createObjectURL(blob);
            _blobCache.set(heroName, { blobUrl });
            return blobUrl;
        } catch (e) {
            return null;
        }
    }

    function cleanUnusedBlobs(activeHeroNames) {
        const activeSet = new Set(activeHeroNames.filter(Boolean));
        for (const [heroName, entry] of _blobCache.entries()) {
            if (!activeSet.has(heroName)) {
                try { URL.revokeObjectURL(entry.blobUrl); } catch (e) { /* ignore */ }
                _blobCache.delete(heroName);
            }
        }
    }

    function clearMemory() {
        _blobCache.forEach((entry) => {
            try { URL.revokeObjectURL(entry.blobUrl); } catch (e) { /* ignore */ }
        });
        _blobCache.clear();
        _sessionKey = null;
        _initialized = false;
    }

    function extractHeroName(data) {
        if (data.heroId) return data.heroId;
        if (data.image) {
            const match = data.image.match(/heroes\/([^.\/]+)\./);
            return match ? match[1] : null;
        }
        return null;
    }

    return {
        init,
        loadHeroVideo,
        clearMemory,
        cleanUnusedBlobs,
        extractHeroName,
        get isEnabled() { return _isEnabled; },
        get initialized() { return _initialized; }
    };
})();

function cleanUnusedHeroVideos() {
    const activeHeroes = [];
    document.querySelectorAll('.slot').forEach(slot => {
        const heroImg = slot.querySelector('.heroImage');
        if (heroImg && heroImg.dataset.activeHero) {
            activeHeroes.push(heroImg.dataset.activeHero);
        }
    });
    MotionHero.cleanUnusedBlobs(activeHeroes);
}
/* ===================== END MOTION HERO MODULE ===================== */

const socket = new WebSocket('ws://localhost:3000/ws');

socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'connected', message: 'Observer connected' }));
};



socket.onmessage = async (event) => {
    if (event.data instanceof Blob) {
   
        try {
            const text = await event.data.text();
            const data = JSON.parse(text);
            handleData(data);
        } catch (error) {
            console.error('Error parsing Blob to JSON:', error);
        }
    } else if (typeof event.data === 'string') {

        try {
            const data = JSON.parse(event.data);
            handleData(data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    } else {
        console.warn('Unknown data type received:', event.data);
    }
};


socket.onclose = () => {
    console.log('WebSocket connection closed');
};


socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};


function handleData(data) {
    if (data.motionHeroEnabled !== undefined && !MotionHero.initialized) {
        MotionHero.init(data.motionHeroEnabled);
    }

    switch (data.type) {
        case 'playSound':
            playSound();
            break;
        case 'updateNames':
            updatePlayerNames(data.names);
            break;
        case 'swapHeroes':
            data.swaps.forEach(swap => updateSwapImage(swap.slotId, swap.image));
            break;
        case 'previousPicks':
            updatePreviousPicks(data);
            break;
        case 'resetPreviousPicks':
            resetPreviousPicksDisplay();
            break;
        case 'resetBanPick':
            resetBanPickSlots();
            MotionHero.clearMemory();
            break;
        default:
            updateSlot(data);
            break;
    }
    switch (data.countdown) {
        case 'restartCountdown':
            startCountdown();
            break;
        default:
            break;
    }
}


function playSound() {
    const lockSound = document.getElementById("lockSound");
    if (lockSound) lockSound.play();
}


function updatePlayerNames(names) {
    const pickSlots = document.querySelectorAll(".slot[id^='pick']");

    pickSlots.forEach((slot, index) => {
        const playerNameElement = slot.querySelector(".player-name");
        if (playerNameElement) {
            const isTeamB = slot.id.includes('B');
            const nameIndex = isTeamB ? 5 + index : index;
            playerNameElement.textContent = names[nameIndex] || "";
        }
    });
}


let countdown;
let timeLeft = 60;
const countdownDisplay = document.getElementById("countdown");

function startCountdown() {
    clearInterval(countdown);
    timeLeft = 60;
    if (countdownDisplay) countdownDisplay.textContent = timeLeft;

    countdown = setInterval(() => {
        timeLeft--;
        if (countdownDisplay) countdownDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdown);
        }
    }, 1000);
}


async function updateSlot(data) {
    const slot = document.getElementById(data.slotId);
    if (!slot) return;

    const heroImageDiv = slot.querySelector('.heroImage');
    if (!heroImageDiv) return;

    // Determine if this is a pick slot (video motion only applies to picks)
    const isPick = data.slotId && data.slotId.startsWith('pick');
    const heroName = MotionHero.extractHeroName(data);

    // Try to load Motion Hero video for PICK slots on SELECT or LOCK
    let videoLoaded = false;
    if (MotionHero.isEnabled && isPick && heroName && (data.type === 'select' || data.type === 'lock')) {
        const existingVideo = heroImageDiv.querySelector('video');
        if (existingVideo && heroImageDiv.dataset.activeHero === heroName) {
            videoLoaded = true;
        } else {
            const blobUrl = await MotionHero.loadHeroVideo(heroName);
            if (blobUrl) {
                const video = document.createElement('video');
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('disablePictureInPicture', '');
                video.setAttribute('controlslist', 'nodownload noplaybackrate');
                video.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;pointer-events:none;';

                const showVideo = () => {
                    if (existingVideo && existingVideo !== video) {
                        existingVideo.pause();
                        existingVideo.removeAttribute('src');
                        existingVideo.remove();
                    }
                    heroImageDiv.style.backgroundImage = '';
                };

                video.onplaying = showVideo;
                video.onloadeddata = showVideo;

                video.src = blobUrl;
                heroImageDiv.appendChild(video);
                heroImageDiv.dataset.activeHero = heroName;

                setTimeout(showVideo, 200);

                let shield = heroImageDiv.querySelector('.glass-shield');
                if (!shield) {
                    shield = document.createElement('div');
                    shield.className = 'glass-shield';
                    shield.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:999;background:transparent;pointer-events:auto;-webkit-user-select:none;user-select:none;';
                    shield.addEventListener('contextmenu', (e) => e.preventDefault());
                    heroImageDiv.appendChild(shield);
                }

                videoLoaded = true;
            }
        }
    }

    // Static image fallback (original logic) — always used for ban slots,
    // or when MotionHero is disabled/unavailable
    if (!videoLoaded) {
        delete heroImageDiv.dataset.activeHero;
        const existingVideo = heroImageDiv.querySelector('video');
        if (existingVideo) {
            existingVideo.pause();
            existingVideo.removeAttribute('src');
            existingVideo.remove();
        }

        heroImageDiv.style.position = 'absolute';
        heroImageDiv.style.backgroundImage = `url(/${data.image})`;
        heroImageDiv.style.backgroundSize = 'cover';
        heroImageDiv.style.backgroundPosition = 'center';
        heroImageDiv.style.width = '100%';
        heroImageDiv.style.height = '100%';
    }

    cleanUnusedHeroVideos();

    // Apply slot state classes (same for video and static)
    if (data.type === 'banActive') {
        slot.classList.add('active');
    } else if (data.type === 'lock') {
        slot.classList.add('locked');
        if (heroImageDiv) {
            heroImageDiv.classList.add('locked');
            heroImageDiv.style.animation = 'zoomInOut 1s forwards';
        }
        slot.classList.remove('active');
    } else if (data.type === 'select') {
        slot.classList.add('active');
    }
}


async function updateSwapImage(slotId, newImage) {
    const slot = document.getElementById(slotId);
    if (!slot) {
        console.error('Slot not found:', slotId);
        return;
    }

    const heroImageDiv = slot.querySelector('.heroImage');
    if (!heroImageDiv) {
        slot.style.backgroundImage = newImage ? `url(${newImage})` : '';
        return;
    }

    const isPick = slotId && slotId.startsWith('pick');
    const heroName = MotionHero.extractHeroName({ image: newImage });

    let videoLoaded = false;
    if (MotionHero.isEnabled && isPick && heroName) {
        const existingVideo = heroImageDiv.querySelector('video');
        if (existingVideo && heroImageDiv.dataset.activeHero === heroName) {
            videoLoaded = true;
        } else {
            const blobUrl = await MotionHero.loadHeroVideo(heroName);
            if (blobUrl) {
                const video = document.createElement('video');
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('disablePictureInPicture', '');
                video.setAttribute('controlslist', 'nodownload noplaybackrate');
                video.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;pointer-events:none;';

                const showVideo = () => {
                    if (existingVideo && existingVideo !== video) {
                        existingVideo.pause();
                        existingVideo.removeAttribute('src');
                        existingVideo.remove();
                    }
                    heroImageDiv.style.backgroundImage = '';
                };

                video.onplaying = showVideo;
                video.onloadeddata = showVideo;

                video.src = blobUrl;
                heroImageDiv.appendChild(video);
                heroImageDiv.dataset.activeHero = heroName;

                setTimeout(showVideo, 200);

                let shield = heroImageDiv.querySelector('.glass-shield');
                if (!shield) {
                    shield = document.createElement('div');
                    shield.className = 'glass-shield';
                    shield.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:999;background:transparent;pointer-events:auto;-webkit-user-select:none;user-select:none;';
                    shield.addEventListener('contextmenu', (e) => e.preventDefault());
                    heroImageDiv.appendChild(shield);
                }

                videoLoaded = true;
            }
        }
    }

    if (!videoLoaded) {
        delete heroImageDiv.dataset.activeHero;
        const existingVideo = heroImageDiv.querySelector('video');
        if (existingVideo) {
            existingVideo.pause();
            existingVideo.removeAttribute('src');
            existingVideo.remove();
        }
        heroImageDiv.style.backgroundImage = newImage ? `url(/${newImage})` : '';
    }
}


// Function to reset ban/pick slots but keep player names
function resetBanPickSlots() {
    // Reset pick slots
    for (let i = 1; i <= 5; i++) {
        ['A', 'B'].forEach(team => {
            const slot = document.getElementById(`pick${team}${i}`);
            if (slot) {
                // Clear hero image
                const heroImageDiv = slot.querySelector('.heroImage');
                if (heroImageDiv) {
                    heroImageDiv.style.backgroundImage = '';
                    heroImageDiv.classList.remove('locked', 'has-hero', 'zoom-effect');
                    heroImageDiv.style.animation = '';
                    heroImageDiv.style.filter = '';
                }
                // Remove classes
                slot.classList.remove('active', 'locked', 'has-hero', 'grayscale', 'zoom-effect');
                // Show lane logo if exists
                const laneLogo = slot.querySelector('.lane-logo');
                if (laneLogo) laneLogo.style.display = 'block';
                // Keep player name - DON'T touch it
            }
        });
    }
    
    // Reset ban slots
    for (let i = 1; i <= 4; i++) {
        ['A', 'B'].forEach(team => {
            const slot = document.getElementById(`ban${team}${i}`);
            if (slot) {
                // Clear hero image
                const heroImageDiv = slot.querySelector('.heroImage');
                if (heroImageDiv) {
                    heroImageDiv.style.backgroundImage = '';
                    heroImageDiv.classList.remove('locked', 'has-hero');
                    heroImageDiv.style.animation = '';
                    heroImageDiv.style.filter = '';
                }
                // Remove classes
                slot.classList.remove('active', 'locked', 'has-hero', 'grayscale');
            }
        });
    }
}

// Function to reset previous picks display
function resetPreviousPicksDisplay() {
    // Check if we're on PreviousListA or PreviousListB page
    if (window.location.pathname.includes('PreviousListA')) {
        const container = document.getElementById('previousContainerA');
        if (container) {
            container.innerHTML = '';
        }
    } else if (window.location.pathname.includes('PreviousListB')) {
        const container = document.getElementById('previousContainerB');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Function to update previous picks display
function updatePreviousPicks(data) {
    // Check if we're on PreviousListA or PreviousListB page
    if (window.location.pathname.includes('PreviousListA')) {
        const container = document.getElementById('previousContainerA');
        if (container) {
            // Display all previous matches for Team A
            let html = '';
            // If we have previous matches data, display them
            if (data.previousMatches && data.previousMatches.length > 0) {
                data.previousMatches.forEach((match, index) => {
                    html += `
                        <div class="previous-match">
                            <div class="match-title">G${index + 1}</div>
                            <div class="previous-picks-grid">
                                ${match.picksA.map(pick => `<div class="previous-pick" style="background-image: url(/${pick})"></div>`).join('')}
                            </div>
                        </div>
                    `;
                });
            } else {
                // Fallback to single match data
                html = `
                    <div class="previous-match">
                        <div class="match-title">Ván Trước</div>
                        <div class="previous-picks-grid">
                            ${data.picksA.map(pick => `<div class="previous-pick" style="background-image: url(/${pick})"></div>`).join('')}
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        }
    } else if (window.location.pathname.includes('PreviousListB')) {
        const container = document.getElementById('previousContainerB');
        if (container) {
            // Display all previous matches for Team B
            let html = '';
            // If we have previous matches data, display them
            if (data.previousMatches && data.previousMatches.length > 0) {
                data.previousMatches.forEach((match, index) => {
                    html += `
                        <div class="previous-match">
                            <div class="match-title">G${index + 1}</div>
                            <div class="previous-picks-grid">
                                ${match.picksB.map(pick => `<div class="previous-pick" style="background-image: url(/${pick})"></div>`).join('')}
                            </div>
                        </div>
                    `;
                });
            } else {
                // Fallback to single match data
                html = `
                    <div class="previous-match">
                        <div class="match-title">Ván Trước</div>
                        <div class="previous-picks-grid">
                            ${data.picksB.map(pick => `<div class="previous-pick" style="background-image: url(/${pick})"></div>`).join('')}
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        }
    }
}
