const socket = new WebSocket('ws://localhost:3000/ws');

// Get current theme from the window location
const getCurrentTheme = () => {
    const pathSegments = window.location.pathname.split('/');
    // Look for 'themes' in the path and get the next segment
    const themeIndex = pathSegments.indexOf('themes');
    if (themeIndex !== -1 && pathSegments[themeIndex + 1]) {
        return pathSegments[themeIndex + 1];
    }
    // Fallback to this theme if not found
    return 'blvChanh_dtdv2026';
};

const CURRENT_THEME = getCurrentTheme();
const THEME_PATH = `/themes/${CURRENT_THEME}`;


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
        case 'resetBanPick':
            resetBanPickSlots();
            break;
        case 'banActive':
       
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


function updateSlot(data) {
    const slot = document.getElementById(data.slotId);
    if (!slot) return;

    const heroImageDiv = slot.querySelector('.heroImage');
    const laneLogo = slot.querySelector('.lane-logo');
    
    if (heroImageDiv) {
        slot.classList.remove('has-hero');
        
        heroImageDiv.style.position = 'absolute';
        
        if (data.image && data.image.trim() !== '') {
            heroImageDiv.style.backgroundImage = `url(/${data.image})`;
            heroImageDiv.style.backgroundSize = 'cover';
            heroImageDiv.style.backgroundPosition = 'center';
            heroImageDiv.style.width = '100%';
            heroImageDiv.style.height = '100%';
            
            slot.classList.add('has-hero');
            // Ẩn lane-logo khi có tướng
            if (laneLogo) laneLogo.style.display = 'none';
        } else {
            // Hiện lane-logo khi không có tướng
            if (laneLogo) laneLogo.style.display = '';
        }
    }

    if (data.type === 'banActive') {
        slot.classList.remove('has-hero');
        slot.classList.add('active');
    } else if (data.type === 'lock') {
        slot.classList.add('locked');
        if (heroImageDiv) {
            heroImageDiv.classList.add('locked');
            heroImageDiv.style.animation = 'zoomInOut 1s forwards';
            if (slot.classList.contains('pick')) {
                slot.classList.add('zoom-effect');
            } else {
                slot.classList.add('grayscale');
            }
        }
        // Ẩn lane-logo khi lock
        if (laneLogo) laneLogo.style.display = 'none';
        slot.classList.remove('active');
    } else if (data.type === 'select') {
        slot.classList.add('active');
        if (data.image && data.image.trim() !== '') {
            slot.classList.add('has-hero');
            // Ẩn lane-logo khi chọn tướng
            if (laneLogo) laneLogo.style.display = 'none';
        } else {
            slot.classList.remove('has-hero');
            // Hiện lane-logo khi chưa chọn tướng
            if (laneLogo) laneLogo.style.display = '';
        }
    }
}


function updateSwapImage(slotId, newImage) {
    const slot = document.getElementById(slotId);
    if (!slot) {
        console.error('Slot not found:', slotId);
        return;
    }

    const heroImageDiv = slot.querySelector('.heroImage');
    if (heroImageDiv) {
        // Đảm bảo URL được format đúng
        const imageUrl = newImage.startsWith('/') ? newImage : `/${newImage}`;
        heroImageDiv.style.backgroundImage = `url(${imageUrl})`;
        
        // Cập nhật các class liên quan
        slot.classList.add('has-hero');
        heroImageDiv.style.backgroundSize = 'cover';
        heroImageDiv.style.backgroundPosition = 'center';
        heroImageDiv.style.width = '100%';
        heroImageDiv.style.height = '100%';
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
                    heroImageDiv.classList.remove('locked');
                    heroImageDiv.style.animation = '';
                    heroImageDiv.style.filter = '';
                }
                // Remove classes
                slot.classList.remove('active', 'locked', 'has-hero', 'zoom-effect', 'grayscale');
                // Show lane logo if exists
                const laneLogo = slot.querySelector('.lane-logo');
                if (laneLogo) laneLogo.style.display = '';
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
                    heroImageDiv.classList.remove('locked');
                    heroImageDiv.style.animation = '';
                    heroImageDiv.style.filter = '';
                }
                // Remove classes
                slot.classList.remove('active', 'locked', 'has-hero', 'zoom-effect', 'grayscale');
            }
        });
    }
}
