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
            break;
        case 'fandomwar-votes':
            // Fandom War votes update - handled by FandomWar pages
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


function updateSlot(data) {
    const slot = document.getElementById(data.slotId);
    if (!slot) return;

    const heroImageDiv = slot.querySelector('.heroImage');
    if (heroImageDiv) {
    heroImageDiv.style.position = 'absolute'
        heroImageDiv.style.backgroundImage = `url(/${data.image})`;
        heroImageDiv.style.backgroundSize = 'cover';
        heroImageDiv.style.backgroundPosition = 'center';
        heroImageDiv.style.width = '100%';
        heroImageDiv.style.height = '100%';
    }

    if (data.type === 'banActive') {
        slot.classList.add('active');
    } else if (data.type === 'lock') {
        slot.classList.add('locked');
        if (heroImageDiv) {
            heroImageDiv.classList.add('locked');
            heroImageDiv.style.animation = 'zoomInOut 1s forwards';
            if (slot.classList.contains('pick')) {
                slot.style.filter = 'none';
            }
            if (slot.classList.contains('ban')) {
                slot.style.filter = 'grayscale(100%)';
            }
        }
        slot.classList.remove('active');
    } else if (data.type === 'select') {
        slot.classList.add('active');
    }
}


function updateSwapImage(slotId, newImage) {
    const slot = document.getElementById(slotId);
    if (!slot) {
        console.error('Slot not found:', slotId);
        return;
    }

    // Check if there's a heroImage div inside the slot (OBS views)
    const heroImageDiv = slot.querySelector('.heroImage');
    if (heroImageDiv) {
        // For OBS views with heroImage div
        heroImageDiv.style.backgroundImage = newImage ? `url(/${newImage})` : '';
        
    } else {
        // For manager view (index.html) where slot itself has the background image
        slot.style.backgroundImage = newImage ? `url(${newImage})` : '';
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
                slot.classList.remove('active', 'locked');
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
                    heroImageDiv.classList.remove('locked');
                    heroImageDiv.style.animation = '';
                    heroImageDiv.style.filter = '';
                }
                // Remove classes
                slot.classList.remove('active', 'locked');
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
