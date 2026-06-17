resetPreviousPicksDisplay();

const socket = new WebSocket('ws://localhost:3000/ws');

// Get current theme from the window location
const getCurrentTheme = () => {
    const pathSegments = window.location.pathname.split('/');
    // Look for 'themes' in the path and get the next segment
    const themeIndex = pathSegments.indexOf('themes');
    if (themeIndex !== -1 && pathSegments[themeIndex + 1]) {
        return pathSegments[themeIndex + 1];
    }
    // Fallback to default theme if not found
    return 'apl2025';
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
        case 'previousPicks':
            updatePreviousPicks(data);
            break;
        case 'resetPreviousPicks':
            resetPreviousPicksDisplay();
            break;
        case 'resetBanPick':
            resetBanPickSlots();
            break;
        case 'teamStatus':
            updateTeamStatusFromWebSocket(data);
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
        const activeIndicator = slot.querySelector('.active-indicator');
        if (activeIndicator) {
            activeIndicator.style.display = 'flex';
            setTimeout(() => activeIndicator.classList.add('show'), 10);
        }
        updateTeamStatus(data.slotId);
    } else if (data.type === 'lock') {
        slot.classList.add('locked');
        if (heroImageDiv) {
            heroImageDiv.classList.add('locked');
            heroImageDiv.style.animation = 'zoomInOut 1s forwards';
            if (slot.classList.contains('pick')) {
                slot.style.filter = 'none';
            }
            if (slot.classList.contains('ban')) {
                heroImageDiv.style.filter = 'grayscale(100%)';
            }
        }
        slot.classList.remove('active');
        const activeIndicator = slot.querySelector('.active-indicator');
        if (activeIndicator) {
            activeIndicator.classList.remove('show');
            setTimeout(() => activeIndicator.style.display = 'none', 300);
        }
        // Cập nhật team status sau khi slot bị lock
        setTimeout(() => checkAndUpdateTeamStatus(), 100);
    } else if (data.type === 'select') {
        slot.classList.add('active');
        const activeIndicator = slot.querySelector('.active-indicator');
        if (activeIndicator) {
            activeIndicator.style.display = 'flex';
            setTimeout(() => activeIndicator.classList.add('show'), 10);
        }
        updateTeamStatus(data.slotId);
    }
}

function updateTeamStatus(activeSlotId = null) {
    const teamAStatus = document.querySelector('.teamA-status');
    const teamBStatus = document.querySelector('.teamB-status');
    
    let hasTeamAActive = false, hasTeamBActive = false;
    
    // Dựa vào activeSlotId để xác định team
    if (activeSlotId) {
        if (activeSlotId.includes('A')) {
            hasTeamAActive = true;
        } else if (activeSlotId.includes('B')) {
            hasTeamBActive = true;
        }
    } else {
        // Quét tất cả slot active nếu không có activeSlotId
        const activeSlots = document.querySelectorAll('.slot.active');
        activeSlots.forEach(slot => {
            if (slot.id.includes('A')) hasTeamAActive = true;
            else if (slot.id.includes('B')) hasTeamBActive = true;
        });
    }

    // Nếu không có slot nào active thì reset
    if (!hasTeamAActive && !hasTeamBActive) {
        resetTeamStatus();
        // Gửi thông tin reset qua WebSocket
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'teamStatus',
                teamA: 'Chưa tới lượt',
                teamB: 'Chưa tới lượt',
                teamAActive: false,
                teamBActive: false
            }));
        }
        return;
    }

    // Cập nhật team A status nếu có
    if (teamAStatus) {
        const statusImage = teamAStatus.querySelector('.status-image');
        if (hasTeamAActive) {
            teamAStatus.classList.add('active');
            statusImage.src = `${THEME_PATH}/assets/Overlay/statusActive.gif`;
        } else {
            teamAStatus.classList.remove('active');
            statusImage.src = `${THEME_PATH}/assets/Overlay/statusNonActive.png`;
        }
    }

    // Cập nhật team B status nếu có
    if (teamBStatus) {
        const statusImage = teamBStatus.querySelector('.status-image');
        if (hasTeamBActive) {
            teamBStatus.classList.add('active');
            statusImage.src = `${THEME_PATH}/assets/Overlay/statusActive.gif`;
        } else {
            teamBStatus.classList.remove('active');
            statusImage.src = `${THEME_PATH}/assets/Overlay/statusNonActive.png`;
        }
    }

    // Gửi thông tin trạng thái qua WebSocket (3 lần để đảm bảo OBS nhận được)
    if (socket.readyState === WebSocket.OPEN) {
        const statusData = {
            type: 'teamStatus',
            teamA: hasTeamAActive ? 'Tới lượt' : 'Chưa tới lượt',
            teamB: hasTeamBActive ? 'Tới lượt' : 'Chưa tới lượt',
            teamAActive: hasTeamAActive,
            teamBActive: hasTeamBActive
        };
        
        socket.send(JSON.stringify(statusData));
        setTimeout(() => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify(statusData)), 50);
        setTimeout(() => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify(statusData)), 100);
    }
}



function resetTeamStatus() {
    const teamAStatus = document.querySelector('.teamA-status');
    const teamBStatus = document.querySelector('.teamB-status');
    if (teamAStatus) {
        teamAStatus.classList.remove('active');
        teamAStatus.querySelector('.status-image').src = `${THEME_PATH}/assets/Overlay/statusNonActive.png`;
    }
    if (teamBStatus) {
        teamBStatus.classList.remove('active');
        teamBStatus.querySelector('.status-image').src = `${THEME_PATH}/assets/Overlay/statusNonActive.png`;
    }
}

function checkAndUpdateTeamStatus() {
    const activeSlots = document.querySelectorAll('.slot.active');
    if (activeSlots.length === 0) {
        resetTeamStatus();
    } else {
        updateTeamStatus();
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


function updateTeamStatusFromWebSocket(data) {
    const teamAStatus = document.querySelector('.teamA-status');
    const teamBStatus = document.querySelector('.teamB-status');
    
    // Cập nhật team A status nếu có
    if (teamAStatus) {
        const statusImage = teamAStatus.querySelector('.status-image');
        if (data.teamAActive) {
            teamAStatus.classList.add('active');
            statusImage.src = `${THEME_PATH}/assets/Overlay/statusActive.gif`;
        } else {
            teamAStatus.classList.remove('active');
            statusImage.src = `${THEME_PATH}/assets/Overlay/statusNonActive.png`;
        }
    }

    // Cập nhật team B status nếu có
    if (teamBStatus) {
        const statusImage = teamBStatus.querySelector('.status-image');
        if (data.teamBActive) {
            teamBStatus.classList.add('active');
            statusImage.src = `${THEME_PATH}/assets/Overlay/statusActive.gif`;
        } else {
            teamBStatus.classList.remove('active');
            statusImage.src = `${THEME_PATH}/assets/Overlay/statusNonActive.png`;
        }
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
                // Remove active indicator
                const activeIndicator = slot.querySelector('.active-indicator');
                if (activeIndicator) {
                    activeIndicator.classList.remove('show');
                    activeIndicator.style.display = 'none';
                }
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
                // Remove active indicator
                const activeIndicator = slot.querySelector('.active-indicator');
                if (activeIndicator) {
                    activeIndicator.classList.remove('show');
                    activeIndicator.style.display = 'none';
                }
            }
        });
    }
    
    // Reset team status
    resetTeamStatus();
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
