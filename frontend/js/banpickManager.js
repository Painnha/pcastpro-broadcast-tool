// banpickManager.js
const socket = window.socketService;

// Expose socket + helpers for other tabs (OBS Manager)
window.banpickSocket = socket;
window.sendObjectiveFromBanpick = (team, objective, action = "start") => {
  if (!window.banpickSocket || !window.banpickSocket.isConnected) return false;
  window.banpickSocket.send({ type: "objective", team, objective, action });
  return true;
};

socket.on('open', () => {
  // Khi WebSocket sẵn sàng, nếu FandomWar đã khởi tạo thì đẩy lại config ra OBS
  if (window.fandomWar && typeof window.fandomWar.broadcastConfig === "function") {
    try {
      window.fandomWar.broadcastConfig();
    } catch (e) {
      console.error("Error broadcasting config on socket open:", e);
    }
  }
});

let selectedHeroImage = "";

/* ===================== HERO LIST (FULL) ===================== */
const heroes = [
  { name: "Edras", image: "images/heroes/Edras.jpg" },
  { name: "Goverra", image: "images/heroes/Goverra.jpg" },
  { name: "Henio", image: "images/heroes/Henio.jpg" },
  { name: "Bỏ trống", image: "images/heroes/khongcam.png" },
  { name: "Airi", image: "images/heroes/Airi.jpg" },
  { name: "Aleister", image: "images/heroes/Aleister.jpg" },
  { name: "Alice", image: "images/heroes/Alice.jpg" },
  { name: "Allain", image: "images/heroes/Allain.jpg" },
  { name: "Amily", image: "images/heroes/Amily.jpg" },
  { name: "Annette", image: "images/heroes/Annette.jpg" },
  { name: "Aoi", image: "images/heroes/Aoi.jpg" },
  { name: "Arduin", image: "images/heroes/Arduin.jpg" },
  { name: "Arthur", image: "images/heroes/Arthur.jpg" },
  { name: "Arum", image: "images/heroes/Arum.jpg" },
  { name: "Astrid", image: "images/heroes/Astrid.jpg" },
  { name: "Ata", image: "images/heroes/Ata.jpg" },
  { name: "Aya", image: "images/heroes/Aya.jpg" },
  { name: "Azzen'ka", image: "images/heroes/Azzenka.jpg" },
  { name: "Baldum", image: "images/heroes/Baldum.jpg" },
  { name: "Billow", image: "images/heroes/Billow.jpg" },
  { name: "Bijan", image: "images/heroes/Bijan.jpg" },
  { name: "Bonnie", image: "images/heroes/Bonnie.jpg" },
  { name: "Both-baron", image: "images/heroes/BoltBaron.jpg" },
  { name: "Biron", image: "images/heroes/Biron.jpg" },
  { name: "Bright", image: "images/heroes/Bright.jpg" },
  { name: "Butterfly", image: "images/heroes/Butterfly.jpg" },
  { name: "Capheny", image: "images/heroes/Capheny.jpg" },
  { name: "Celica", image: "images/heroes/Celica.jpg" },
  { name: "Charlotte", image: "images/heroes/Charlotte.jpg" },
  { name: "Chaugnar", image: "images/heroes/Chaugnar.jpg" },
  { name: "Cresht", image: "images/heroes/Cresht.jpg" },
  { name: "D'arcy", image: "images/heroes/Darcy.jpg" },
  { name: "Dextra", image: "images/heroes/Dextra.jpg" },
  { name: "Dieu thuyen", image: "images/heroes/DieuThuyen.jpg" },
  { name: "Dirak", image: "images/heroes/Dirak.jpg" },
  { name: "Dolia", image: "images/heroes/Dolia.jpg" },
  { name: "Erin", image: "images/heroes/Erin.jpg" },
  { name: "Eland'orr", image: "images/heroes/Elandorr.jpg" },
  { name: "Elsu", image: "images/heroes/Elsu.jpg" },
  { name: "Enzo", image: "images/heroes/Enzo.jpg" },
  { name: "Errol", image: "images/heroes/Errol.jpg" },
  { name: "Fenik", image: "images/heroes/Fenik.jpg" },
  { name: "Flash", image: "images/heroes/Flash.jpg" },
  { name: "Florentino", image: "images/heroes/Florentino.jpg" },
  { name: "Gildur", image: "images/heroes/Gildur.jpg" },
  { name: "Grakk", image: "images/heroes/Grakk.jpg" },
  { name: "Hayate", image: "images/heroes/Hayate.jpg" },
  { name: "Helen", image: "images/heroes/Helen.jpg" },
  { name: "Iggy", image: "images/heroes/Iggy.jpg" },
  { name: "Ignis", image: "images/heroes/Ignis.jpg" },
  { name: "Illumia", image: "images/heroes/Illumia.jpg" },
  { name: "Ishar", image: "images/heroes/Ishar.jpg" },
  { name: "Jinna", image: "images/heroes/Jinna.jpg" },
  { name: "Kahlii", image: "images/heroes/Kahlii.jpg" },
  { name: "Kain", image: "images/heroes/Kain.jpg" },
  { name: "Keera", image: "images/heroes/Keera.jpg" },
  { name: "Kil'groth", image: "images/heroes/Kilgroth.jpg" },
  { name: "Kriknak", image: "images/heroes/Kriknak.jpg" },
  { name: "Kriktor", image: "images/heroes/Richter.jpg" },
  { name: "Krixi", image: "images/heroes/Krixi.jpg" },
  { name: "Krizzix", image: "images/heroes/Krizzix.jpg" },
  { name: "Lauriel", image: "images/heroes/Lauriel.jpg" },
  { name: "Laville", image: "images/heroes/Laville.jpg" },
  { name: "Liliana", image: "images/heroes/Liliana.jpg" },
  { name: "Lindis", image: "images/heroes/Lindis.jpg" },
  { name: "Lorion", image: "images/heroes/Lorion.jpg" },
  { name: "Lu Bo", image: "images/heroes/Lubo.jpg" },
  { name: "Lumburr", image: "images/heroes/Lumburr.jpg" },
  { name: "Maloch", image: "images/heroes/Maloch.jpg" },
  { name: "Marja", image: "images/heroes/Marja.jpg" },
  { name: "Max", image: "images/heroes/Max.jpg" },
  { name: "Mganga", image: "images/heroes/Mganga.jpg" },
  { name: "Mina", image: "images/heroes/Mina.jpg" },
  { name: "Ming", image: "images/heroes/Ming.jpg" },
  { name: "Moren", image: "images/heroes/Moren.jpg" },
  { name: "Murad", image: "images/heroes/Murad.jpg" },
  { name: "Nakroth", image: "images/heroes/Nakroth.jpg" },
  { name: "Natalya", image: "images/heroes/Natalya.jpg" },
  { name: "Ngo Khong", image: "images/heroes/NgoKhong.jpg" },
  { name: "Omega", image: "images/heroes/Omega.jpg" },
  { name: "Omen", image: "images/heroes/Omen.jpg" },
  { name: "Ormarr", image: "images/heroes/Ormarr.jpg" },
  { name: "Paine", image: "images/heroes/Paine.jpg" },
  { name: "Preyta", image: "images/heroes/Preyta.jpg" },
  { name: "Qi", image: "images/heroes/Qi.jpg" },
  { name: "Quillen", image: "images/heroes/Quillen.jpg" },
  { name: "Raz", image: "images/heroes/Raz.jpg" },
  { name: "Richter", image: "images/heroes/Richter.jpg" },
  { name: "Rouie", image: "images/heroes/Rouie.jpg" },
  { name: "Rourke", image: "images/heroes/Rourke.jpg" },
  { name: "Roxie", image: "images/heroes/Roxie.jpg" },
  { name: "Ryoma", image: "images/heroes/Ryoma.jpg" },
  { name: "Sephera", image: "images/heroes/Sephera.jpg" },
  { name: "Sinestrea", image: "images/heroes/Sinestrea.jpg" },
  { name: "Skud", image: "images/heroes/Skud.jpg" },
  { name: "Slimz", image: "images/heroes/Slimz.jpg" },
  { name: "Stuart", image: "images/heroes/Stuart.jpg" },
  { name: "Superman", image: "images/heroes/Superman.jpg" },
  { name: "Taara", image: "images/heroes/Taara.jpg" },
  { name: "Tachi", image: "images/heroes/Tachi.jpg" },
  { name: "Teemee", image: "images/heroes/Teemee.jpg" },
  { name: "Teeri", image: "images/heroes/Teeri.jpg" },
  { name: "Tel'annas", image: "images/heroes/Telannas.jpg" },
  { name: "Thane", image: "images/heroes/Thane.jpg" },
  { name: "Thorne", image: "images/heroes/Thorn.jpg" },
  { name: "Toro", image: "images/heroes/Toro.jpg" },
  { name: "Triệu Vân", image: "images/heroes/TrieuVan.jpg" },
  { name: "Tulen", image: "images/heroes/Tulen.jpg" },
  { name: "Valhein", image: "images/heroes/Valhein.jpg" },
  { name: "Veera", image: "images/heroes/Veera.jpg" },
  { name: "Veres", image: "images/heroes/Veres.jpg" },
  { name: "Violet", image: "images/heroes/Violet.jpg" },
  { name: "Volkath", image: "images/heroes/Volkath.jpg" },
  { name: "Wiro", image: "images/heroes/Wiro.jpg" },
  { name: "Wonder Woman", image: "images/heroes/Wonder.jpg" },
  { name: "Wisp", image: "images/heroes/Wisp.jpg" },
  { name: "Xeniel", image: "images/heroes/Xeniel.jpg" },
  { name: "Yan", image: "images/heroes/Yan.jpg" },
  { name: "Y'bneth", image: "images/heroes/Ybneth.jpg" },
  { name: "Yena", image: "images/heroes/Yena.jpg" },
  { name: "Yorn", image: "images/heroes/Yorn.jpg" },
  { name: "Yue", image: "images/heroes/Yue.jpg" },
  { name: "Zata", image: "images/heroes/Zata.jpg" },
  { name: "Zephys", image: "images/heroes/Zephys.jpg" },
  { name: "Zill", image: "images/heroes/Zill.jpg" },
  { name: "Zip", image: "images/heroes/Zip.jpg" },
  { name: "Zuka", image: "images/heroes/Zuka.jpg" },
];

/* ===================== RENDER HERO GRID ===================== */
const heroContainer = document.querySelector(".hero-grid");

function updateHeroDisplay(filteredHeroes) {
  heroContainer.innerHTML = "";
  filteredHeroes.forEach((hero) => {
    const heroDiv = document.createElement("div");
    heroDiv.className = "hero";
    heroDiv.style.backgroundImage = `url(${hero.image})`;
    heroDiv.onclick = () => {
      selectedHeroImage = hero.image;
      selectHero(hero.image);
    };
    const heroNameDiv = document.createElement("div");
    heroNameDiv.textContent = hero.name;
    heroNameDiv.className = "heroName";
    heroDiv.appendChild(heroNameDiv);
    heroContainer.appendChild(heroDiv);
  });
}
updateHeroDisplay(heroes);

/* ===================== HERO SEARCH ===================== */
const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", function () {
  const searchTerm = this.value.toLowerCase();
  const filteredHeroes = heroes.filter((hero) =>
    hero.name.toLowerCase().includes(searchTerm)
  );
  updateHeroDisplay(filteredHeroes);
});

/* ===================== PICK ORDER & COUNTDOWN ===================== */
const order = [
  "banA1", "banB1", "banA2", "banB2",
  "pickA1", "pickB1", "pickB2", "pickA2",
  "pickA3", "pickB3", "banB3", "banA3",
  "banB4", "banA4", "pickB4", "pickA4",
  "pickA5", "pickB5",
];
let currentIndex = 0;

let countdown;
let timeLeft = 60;
const countdownDisplay = document.getElementById("countdown");

function startCountdown() {
  clearInterval(countdown);
  timeLeft = 60;
  countdownDisplay.textContent = timeLeft;
  countdown = setInterval(() => {
    timeLeft--;
    countdownDisplay.textContent = timeLeft;
    if (timeLeft <= 0) clearInterval(countdown);
  }, 1000);
}

/* ===================== BAN/PICK FLOW ===================== */
document.getElementById("startButton").onclick = function () {
  currentIndex = 0;
  highlightNextSlot();
  startCountdown();
  this.disabled = true;
  socket.send(JSON.stringify({ countdown: "restartCountdown" }));
};

function highlightNextSlot() {
  if (currentIndex < order.length) {
    const slotId = order[currentIndex];
    const slot = document.getElementById(slotId);
    slot.classList.add("active-ban");

    const selectedSlot = document.querySelector(".slot.selected");
    if (selectedSlot) selectedSlot.classList.remove("selected");
    slot.classList.add("selected");

    sendSlotUpdate(slotId, slot.style.backgroundImage, "banActive");

    if (slotId === "pickB1" || slotId === "pickA2" || slotId === "pickA4") {
      const nextSlotId = order[currentIndex + 1];
      const nextSlot = document.getElementById(nextSlotId);
      if (nextSlot) {
        nextSlot.classList.add("active-ban");
        sendSlotUpdate(nextSlotId, nextSlot.style.backgroundImage, "banActive");
      }
    }
  }
}

function selectHero(image) {
  const selectedSlot = document.querySelector(".slot.selected");
  if (selectedSlot && !selectedSlot.classList.contains("locked")) {
    selectedSlot.style.backgroundImage = `url(${image})`;
    selectedSlot.dataset.heroImage = image;
    sendSlotUpdate(selectedSlot.id, image, "select");
  }
}

function lockSlot() {
  const selectedSlots = document.querySelectorAll(".slot.active-ban");
  let allFilled = true;
  selectedSlots.forEach((s) => {
    if (!s.dataset.heroImage) allFilled = false;
  });
  if (!allFilled) {
    document.getElementById("error-message").innerText =
      "Vui lòng pick tướng vào tất cả các ô trước khi khóa!";
    return;
  }

  if (selectedSlots.length > 0) {
    document.getElementById("error-message").innerText = "";
    startCountdown();

    const lockSound = document.getElementById("lockSound");
    lockSound && lockSound.play();
    socket.send(JSON.stringify({ type: "playSound", sound: "PickEffect.mp3" }));

    selectedSlots.forEach((s) => {
      s.classList.add("locked");
      s.classList.remove("active-ban");
      const heroImage = s.dataset.heroImage;
      s.style.backgroundImage = `url(${heroImage})`;

      const logo = s.querySelector(".lane-logo");
      if (logo) logo.style.display = "none";
      if (s.id.startsWith("pick")) {
        s.classList.add("zoom-effect");
        s.style.filter = "none";
      } else {
        s.style.filter = "grayscale(100%)";
      }

      sendSlotUpdate(s.id, heroImage, "lock", "restartCountdown");
    });
    currentIndex += selectedSlots.length;
    highlightNextSlot();
  }
}
document.getElementById("lockButton").onclick = lockSlot;

function sendSlotUpdate(slotId, image, type, countdown) {
  socket.send(JSON.stringify({ slotId, image, type, countdown }));
}

/* ===================== CLICK SELECT SLOT ===================== */
document.querySelectorAll(".slot").forEach((slot) => {
  slot.addEventListener("click", function () {
    if (this.classList.contains("active-ban") && !this.classList.contains("locked")) {
      document.querySelectorAll(".slot.selected").forEach((s) => s.classList.remove("selected"));
      this.classList.add("selected");
    }
  });
});

/* ===================== SELECTED/ZOOM CSS (INLINE) ===================== */
const style = document.createElement("style");
style.innerHTML = `
.slot.selected { background-color: rgba(255, 255, 0, 0.5); }
.slot.zoom-effect { animation: zoomInOut 0.7s ease-in-out; }
@keyframes zoomInOut { 0%, 100% { transform: scale(1);} 50% { transform: scale(1.2);} }
`;
document.head.appendChild(style);

/* ===================== EDIT PLAYER NAMES ===================== */
document.getElementById("editNameButton").onclick = function () {
  const names = document.getElementById("nameInput").value
    .split(",")
    .map((n) => n.trim());
  const pickSlots = document.querySelectorAll(".slot[id^='pick']");
  pickSlots.forEach((slot, index) => {
    const playerNameElement = slot.querySelector(".player-name");
    if (playerNameElement) playerNameElement.textContent = names[index] || "Trống";
  });
  socket.send(JSON.stringify({ type: "updateNames", names }));
};

/* ===================== TEAM INFO (SAVE / RESET / LOAD) ===================== */
const handleSaveTeamInfo = async () => {
  const teamAName = document.getElementById("teamAName").value.trim();
  const teamBName = document.getElementById("teamBName").value.trim();
  const scoreA = parseInt(document.getElementById("scoreA").value) || 0;
  const scoreB = parseInt(document.getElementById("scoreB").value) || 0;

  if (!teamAName || !teamBName) {
    showTeamInfoMessage("Vui lòng nhập tên cho cả hai đội", "error");
    return;
  }

  try {
    const data = await API.post("/api/save-team-info", { teamAName, teamBName, scoreA, scoreB });
    showTeamInfoMessage("Thông tin đội đã được lưu thành công!", "success");
  } catch (err) {
    showTeamInfoMessage(err.message || "Không thể lưu thông tin đội", "error");
  }
};

const loadTeamInfoFromFiles = async () => {
  try {
    const data = await API.get("/api/get-team-info");
    document.getElementById("teamAName").value = data.teamAName;
    document.getElementById("teamBName").value = data.teamBName;
    document.getElementById("scoreA").value = data.scoreA;
    document.getElementById("scoreB").value = data.scoreB;
  } catch (err) {
    console.error("Error loading team info:", err);
  }
};

const handleResetTeamInfo = async () => {
  document.getElementById("teamAName").value = "team xanh";
  document.getElementById("teamBName").value = "team đỏ";
  document.getElementById("scoreA").value = "0";
  document.getElementById("scoreB").value = "0";
  try {
    await API.post("/api/save-team-info", {
      teamAName: "team xanh",
      teamBName: "team đỏ",
      scoreA: 0,
      scoreB: 0,
    });
    showTeamInfoMessage("Đã reset về giá trị mặc định và lưu vào file!", "success");
  } catch (err) {
    showTeamInfoMessage("Reset thành công nhưng có lỗi khi lưu file", "error");
  }
};

const showTeamInfoMessage = (message, type) => {
  const div = document.getElementById("teaminfo-message");
  if (!div) return;
  div.textContent = message;
  div.className = type;
  setTimeout(() => {
    div.textContent = "";
    div.className = "";
  }, 3000);
};

const handleSwapTeamInfo = async () => {
  // Get current values
  const teamAName = document.getElementById("teamAName").value.trim();
  const teamBName = document.getElementById("teamBName").value.trim();
  const scoreA = parseInt(document.getElementById("scoreA").value) || 0;
  const scoreB = parseInt(document.getElementById("scoreB").value) || 0;

  // Swap values in the input fields
  document.getElementById("teamAName").value = teamBName;
  document.getElementById("teamBName").value = teamAName;
  document.getElementById("scoreA").value = scoreB;
  document.getElementById("scoreB").value = scoreA;

  // Swap player names in the pick slots THEO LANE (Top/Jung/Mid/ADC/Support)
  const laneToSlotA = {
    Top: "pickA1",
    Jung: "pickA2",
    Mid: "pickA3",
    ADC: "pickA4",
    Support: "pickA5",
  };
  const laneToSlotB = {
    Top: "pickB5", // Team B hiển thị đảo chiều
    Jung: "pickB4",
    Mid: "pickB3",
    ADC: "pickB2",
    Support: "pickB1",
  };

  ["Top", "Jung", "Mid", "ADC", "Support"].forEach((lane) => {
    const slotA = document.getElementById(laneToSlotA[lane]);
    const slotB = document.getElementById(laneToSlotB[lane]);
    if (!slotA || !slotB) return;

    const nameElA = slotA.querySelector(".player-name");
    const nameElB = slotB.querySelector(".player-name");
    if (!nameElA || !nameElB) return;

    const tmp = nameElA.textContent || "";
    nameElA.textContent = nameElB.textContent || "";
    nameElB.textContent = tmp;
  });

  // Sau khi DOM đã cập nhật, build lại danh sách tên theo thứ tự các ô pick
  try {
    const pickSlots = document.querySelectorAll(".slot[id^='pick']");
    const names = [];
    pickSlots.forEach((slot) => {
      const playerNameElement = slot.querySelector(".player-name");
      names.push(playerNameElement ? playerNameElement.textContent || "" : "");
    });

    socket.send(JSON.stringify({ type: "updateNames", names }));
  } catch (e) {
    // Silently ignore socket errors
  }

  // Note: We don't swap the current picks in the pick slots because they are positional
  // The pick slots (pickA1, pickA2, etc.) remain in their positions
  // What changes is the team association, not the slot positions
  
  // Swap previous matches data in memory and for OBS views
  if (window.previousMatches && window.previousMatches.length > 0) {
    // Create swapped previous matches data
    const swappedPreviousMatches = window.previousMatches.map(match => ({
      picksA: match.picksB, // Swap A and B
      picksB: match.picksA,
      hasData: match.hasData
    }));
    
    // Update the window.previousMatches array with swapped data
    window.previousMatches = swappedPreviousMatches;
    
    // Update the display in the manager view
    displayPreviousMatches();
    
    // Send swapped previous picks data via socket
    try {
      socket.send(JSON.stringify({ 
        type: "previousPicks", 
        previousMatches: swappedPreviousMatches
      }));
    } catch (e) {
      // Silently ignore socket errors
    }
  }
  
  // Save swapped team info to files (ignore if fails)
  try {
    await API.post("/api/save-team-info", { 
      teamAName: teamBName, 
      teamBName: teamAName, 
      scoreA: scoreB, 
      scoreB: scoreA 
    });
  } catch (err) {
    // Silently ignore file save errors
  }

  // Đồng bộ đổi bên với OBS Manager (camera + tên trong tab OBS)
  if (window.obsManagerAPI && typeof window.obsManagerAPI.swapTeamsCameraData === "function") {
    try {
      window.obsManagerAPI.swapTeamsCameraData();
    } catch (e) {
      console.warn("Lỗi khi swap camera data trong OBS Manager:", e);
    }
  }

  // Execute OBS swap pairs
  if (window.obsManagerAPI && typeof window.obsManagerAPI.executeSwapPairs === "function") {
    try {
      await window.obsManagerAPI.executeSwapPairs();
    } catch (e) {
      console.warn("Lỗi khi swap OBS sources:", e);
    }
  }

  // Swap FandomWar vote counts, keywords, and gifts
  if (window.fandomWar) {
    try {
      // Swap vote counts
      const tempVotes = window.fandomWar.teamAVotes;
      window.fandomWar.teamAVotes = window.fandomWar.teamBVotes;
      window.fandomWar.teamBVotes = tempVotes;
      
      // Swap keywords
      const tempKeyword = window.fandomWar.teamAKeyword;
      window.fandomWar.teamAKeyword = window.fandomWar.teamBKeyword;
      window.fandomWar.teamBKeyword = tempKeyword;
      
      // Swap keyword input values
      if (window.fandomWar.teamAKeywordInput) {
        window.fandomWar.teamAKeywordInput.value = window.fandomWar.teamAKeyword;
      }
      if (window.fandomWar.teamBKeywordInput) {
        window.fandomWar.teamBKeywordInput.value = window.fandomWar.teamBKeyword;
      }
      
      // Swap Facebook keywords if exists
      if (window.fandomWar.teamAKeywordFbInput && window.fandomWar.teamBKeywordFbInput) {
        const tempFbKeyword = window.fandomWar.teamAKeywordFbInput.value.trim();
        window.fandomWar.teamAKeywordFbInput.value = window.fandomWar.teamBKeywordFbInput.value.trim();
        window.fandomWar.teamBKeywordFbInput.value = tempFbKeyword;
      }
      
      // Swap gifts
      const tempGifts = [...window.fandomWar.teamAGifts];
      window.fandomWar.teamAGifts = [...window.fandomWar.teamBGifts];
      window.fandomWar.teamBGifts = tempGifts;
      
      // Swap team assignment in comments array
      if (window.fandomWar.comments && Array.isArray(window.fandomWar.comments)) {
        window.fandomWar.comments.forEach(comment => {
          if (comment.team === 'team-a') {
            comment.team = 'team-b';
          } else if (comment.team === 'team-b') {
            comment.team = 'team-a';
          }
        });
        // Update comments display with swapped teams
        if (typeof window.fandomWar.updateCommentsDisplay === "function") {
          window.fandomWar.updateCommentsDisplay();
        }
      }
      
      // Update gift checkboxes in dropdowns
      if (window.fandomWar.teamAGiftDropdown && window.fandomWar.teamBGiftDropdown) {
        const teamACheckboxes = window.fandomWar.teamAGiftDropdown.querySelectorAll('input[type="checkbox"]');
        const teamBCheckboxes = window.fandomWar.teamBGiftDropdown.querySelectorAll('input[type="checkbox"]');
        
        // Save current checkbox states
        const teamAGiftStates = {};
        teamACheckboxes.forEach(cb => {
          teamAGiftStates[cb.value] = cb.checked;
        });
        
        const teamBGiftStates = {};
        teamBCheckboxes.forEach(cb => {
          teamBGiftStates[cb.value] = cb.checked;
        });
        
        // Swap checkbox states
        teamACheckboxes.forEach(cb => {
          cb.checked = teamBGiftStates[cb.value] || false;
        });
        
        teamBCheckboxes.forEach(cb => {
          cb.checked = teamAGiftStates[cb.value] || false;
        });
        
        // Update dropdown states (disable/enable logic)
        if (typeof window.fandomWar.updateGiftDropdownStates === "function") {
          window.fandomWar.updateGiftDropdownStates();
        }
      }
      
      // Update votes display
      if (typeof window.fandomWar.updateVotesDisplay === "function") {
        window.fandomWar.updateVotesDisplay();
      }
      
      // Save settings and broadcast config
      if (typeof window.fandomWar.saveSettings === "function") {
        window.fandomWar.saveSettings();
      }
      if (typeof window.fandomWar.saveGiftSettings === "function") {
        window.fandomWar.saveGiftSettings();
      }
      if (typeof window.fandomWar.broadcastConfig === "function") {
        window.fandomWar.broadcastConfig();
      }
    } catch (e) {
      console.warn("Lỗi khi swap FandomWar data:", e);
    }
  }

  // Show success message
  showTeamInfoMessage("Đã đổi thông tin đội!", "success");
};

/* ===================== PREVIOUS PICKS (RAM ONLY) ===================== */
window.previousMatches = [];

const handleNextMatch = () => {
  const match = getCurrentMatchData();
  if (!match.hasData) {
    alert("Chưa có dữ liệu trận để lưu!");
    return;
  }
  savePreviousMatch(match);
  resetCurrentMatch();
  displayPreviousMatches();
  
  // Send all previous picks data via socket
  socket.send(JSON.stringify({ 
    type: "previousPicks", 
    previousMatches: window.previousMatches
  }));
  
  // Send reset ban/pick message to OBS views
  socket.send(JSON.stringify({ 
    type: "resetBanPick"
  }));
  
  alert("Trận đã được lưu! Bắt đầu ván mới.");
};

const getCurrentMatchData = () => {
  const picksA = [];
  const picksB = [];
  let hasData = false;

  for (let i = 1; i <= 5; i++) {
    const slotA = document.getElementById(`pickA${i}`);
    const slotB = document.getElementById(`pickB${i}`);
    if (slotA && slotA.dataset.heroImage) {
      picksA.push(slotA.dataset.heroImage);
      hasData = true;
    }
    if (slotB && slotB.dataset.heroImage) {
      picksB.push(slotB.dataset.heroImage);
      hasData = true;
    }
  }

  return { picksA, picksB, hasData };
};

const savePreviousMatch = (matchData) => {
  window.previousMatches.push(matchData);
  if (window.previousMatches.length > 7) {
    window.previousMatches = window.previousMatches.slice(-7);
  }
};

const resetCurrentMatch = () => {
  // Disable swap functionality khi reset match
  disableSwapFunctionality();
  
  // reset 10 pick slots
  for (let i = 1; i <= 5; i++) {
    ["A", "B"].forEach((team) => {
      const slot = document.getElementById(`pick${team}${i}`);
      if (slot) {
        slot.style.backgroundImage = "";
        slot.dataset.heroImage = "";
        // giữ class slot/pick/teamA|teamB
        slot.classList.remove("locked", "active-ban", "selected", "selectedswap", "zoom-effect");
        const logo = slot.querySelector(".lane-logo");
        if (logo) logo.style.display = "block";
        slot.style.filter = "";
      }
    });
  }
  // reset 8 ban slots
  for (let i = 1; i <= 4; i++) {
    ["A", "B"].forEach((team) => {
      const slot = document.getElementById(`ban${team}${i}`);
      if (slot) {
        slot.style.backgroundImage = "";
        slot.dataset.heroImage = "";
        slot.classList.remove("locked", "active-ban", "selected");
        slot.style.filter = "";
      }
    });
  }
  currentIndex = 0;
  clearInterval(countdown);
  timeLeft = 60;
  countdownDisplay.textContent = timeLeft;
  document.getElementById("startButton").disabled = false;
  document.getElementById("error-message").innerText = "";
};

const displayPreviousMatches = () => {
  const container = document.getElementById("previousMatchesContainer");
  const matches = window.previousMatches || [];

  if (matches.length === 0) {
    container.innerHTML = '<div class="no-previous">Chưa có trận nào</div>';
    return;
  }

  container.innerHTML = "";
  matches.forEach((match, index) => {
    const matchDiv = document.createElement("div");
    matchDiv.className = "previous-match";
    matchDiv.innerHTML = `
      <div class="match-title">Trận ${index + 1}</div>
      <div class="previous-teams">
        <div class="previous-team team-a">
          <div class="previous-picks-grid">
            ${match.picksA
              .map((p) => `<div class="previous-pick" style="background-image: url(${p})"></div>`)
              .join("")}
          </div>
        </div>
        <div class="previous-team team-b">
          <div class="previous-picks-grid">
            ${match.picksB
              .map((p) => `<div class="previous-pick" style="background-image: url(${p})"></div>`)
              .join("")}
          </div>
        </div>
      </div>
    `;
    container.appendChild(matchDiv);
  });
};

const handleResetPreviousMatches = () => {
  // Clear the previous matches array
  window.previousMatches = [];
  
  // Reset the current match display
  resetCurrentMatch();
  
  // Update the previous matches display
  displayPreviousMatches();
  
  // Send reset message to OBS views
  socket.send(JSON.stringify({ 
    type: "resetPreviousPicks"
  }));
  
  alert("Đã reset toàn bộ dữ liệu previous picks!");
};

/* ===================== AUTOFILL (TEST) ===================== */
const handleAutoFill = () => {
  // Lấy 18 ảnh khác nhau từ danh sách (nếu thiếu sẽ lặp lại)
  const pool = heroes.map(h => h.image).filter(p => p && !p.includes("khongcam"));
  const pickList = [];
  let idx = 0;
  const take = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(pool[idx % pool.length]);
      idx++;
    }
    return out;
  };

  // 10 pick + 8 ban
  const picks = take(10);
  const bans  = take(8);

  // Fill picks
  let p = 0;
  for (let i = 1; i <= 5; i++) {
    const slotA = document.getElementById(`pickA${i}`);
    const slotB = document.getElementById(`pickB${i}`);
    if (slotA) {
      slotA.style.backgroundImage = `url(${picks[p]})`;
      slotA.dataset.heroImage = picks[p];
      slotA.classList.add("locked");
      const logo = slotA.querySelector(".lane-logo");
      if (logo) logo.style.display = "none";
      slotA.style.filter = "none";
      p++;
    }
    if (slotB) {
      slotB.style.backgroundImage = `url(${picks[p]})`;
      slotB.dataset.heroImage = picks[p];
      slotB.classList.add("locked");
      const logo = slotB.querySelector(".lane-logo");
      if (logo) logo.style.display = "none";
      slotB.style.filter = "none";
      p++;
    }
  }

  // Fill bans
  let b = 0;
  for (let i = 1; i <= 4; i++) {
    const banA = document.getElementById(`banA${i}`);
    const banB = document.getElementById(`banB${i}`);
    if (banA) {
      banA.style.backgroundImage = `url(${bans[b]})`;
      banA.dataset.heroImage = bans[b];
      banA.classList.add("locked");
      banA.style.filter = "grayscale(100%)";
      b++;
    }
    if (banB) {
      banB.style.backgroundImage = `url(${bans[b]})`;
      banB.dataset.heroImage = bans[b];
      banB.classList.add("locked");
      banB.style.filter = "grayscale(100%)";
      b++;
    }
  }

  alert("Đã auto fill đầy đủ 18 ô để test nhanh!");
};

/* ===================== INIT ===================== */
document.addEventListener("DOMContentLoaded", function () {
  const saveTeamInfoButton = document.getElementById("saveTeamInfoButton");
  if (saveTeamInfoButton) saveTeamInfoButton.addEventListener("click", handleSaveTeamInfo);

  const swapTeamInfoButton = document.getElementById("swapTeamInfoButton");
  if (swapTeamInfoButton) swapTeamInfoButton.addEventListener("click", handleSwapTeamInfo);

  const resetTeamInfoButton = document.getElementById("resetTeamInfoButton");
  if (resetTeamInfoButton) resetTeamInfoButton.addEventListener("click", handleResetTeamInfo);

  const nextMatchButton = document.getElementById("nextMatchButton");
  if (nextMatchButton) nextMatchButton.addEventListener("click", handleNextMatch);

  const resetPreviousButton = document.getElementById("resetPreviousButton");
  if (resetPreviousButton) resetPreviousButton.addEventListener("click", handleResetPreviousMatches);

  const autoFillButton = document.getElementById("autoFillButton");
  if (autoFillButton) autoFillButton.addEventListener("click", handleAutoFill);

  // Hiển thị previous matches rỗng lúc đầu; Load team info từ file txt
  window.previousMatches = [];
  displayPreviousMatches();
  loadTeamInfoFromFiles();

  // ===================== OBJECTIVE BUTTON HANDLERS =====================
  // Get all objective buttons
  const objectiveButtons = document.querySelectorAll('.obj-button');
  objectiveButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Find parent section to determine team
      const section = button.closest('.section');
      let team = '';
      if (section && section.classList.contains('left')) {
        team = 'A';
      } else if (section && section.classList.contains('right')) {
        team = 'B';
      }

      // Determine objective type from button text
      const buttonText = button.textContent.trim();
      let objective = '';
      if (buttonText.includes('Rồng')) {
        objective = 'rong';
      } else if (buttonText.includes('Tà thần')) {
        objective = 'tathan';
      }

      // Send WebSocket message
      if (team && objective) {
        sendObjectiveFromBanpick(team, objective, 'start');
      }
    });
  });
});

// Export handlers for other tabs (OBS Manager quick buttons)
window.handleNextMatch = handleNextMatch;
window.handleSwapTeamInfo = handleSwapTeamInfo;

/* ================= SWAP HERO ================= */
let firstSelectedSlot = null;
let secondSelectedSlot = null;
let swapListenersAttached = false;

function enableSwapFunctionality() {
  if (swapListenersAttached) return; // Đã attach rồi thì không attach lại
  
  const slots = document.querySelectorAll(".slot");
  slots.forEach((slot) => {
    slot.addEventListener("click", handleSlotSelection);
  });
  swapListenersAttached = true;
}

function disableSwapFunctionality() {
  if (!swapListenersAttached) return; // Chưa attach thì không cần remove
  
  const slots = document.querySelectorAll(".slot");
  slots.forEach((slot) => {
    slot.removeEventListener("click", handleSlotSelection);
  });
  swapListenersAttached = false;
  firstSelectedSlot = null;
  secondSelectedSlot = null;
  
  // Xóa class selectedswap khỏi tất cả slot
  document.querySelectorAll(".slot.selectedswap").forEach((slot) => {
    slot.classList.remove("selectedswap");
  });
}

function handleSlotSelection(event) {
  // Tìm element thực tế là slot (có thể click vào child element)
  let selectedSlot = event.target;
  while (selectedSlot && !selectedSlot.classList.contains("slot")) {
    selectedSlot = selectedSlot.parentElement;
  }
  
  if (!selectedSlot) return; // Không tìm thấy slot thì return
  
  // CHỈ cho phép swap khi TẤT CẢ picks đều đã bị locked
  const allPickSlots = document.querySelectorAll(".slot[id^='pick']");
  const allPicksLocked = Array.from(allPickSlots).every(slot => slot.classList.contains("locked"));
  
  // Nếu chưa lock hết picks thì KHÔNG cho swap
  if (!allPicksLocked) {
    return;
  }

  if (!firstSelectedSlot) {
    firstSelectedSlot = selectedSlot;
    selectedSlot.classList.add("selectedswap");
  } else if (selectedSlot === firstSelectedSlot) {
    firstSelectedSlot.classList.remove("selectedswap");
    firstSelectedSlot = null;
  } else if (!secondSelectedSlot) {
    secondSelectedSlot = selectedSlot;
    swapHeroes();
  }
}

function swapHeroes() {
  if (firstSelectedSlot && secondSelectedSlot) {
    const tempImage = firstSelectedSlot.style.backgroundImage;
    firstSelectedSlot.style.backgroundImage =
      secondSelectedSlot.style.backgroundImage;
    secondSelectedSlot.style.backgroundImage = tempImage;


    const firstImageUrl = extractImageUrl(
      firstSelectedSlot.style.backgroundImage
    );
    const secondImageUrl = extractImageUrl(
      secondSelectedSlot.style.backgroundImage
    );

    sendSwapUpdate(
      firstSelectedSlot.id,
      firstImageUrl,
      secondSelectedSlot.id,
      secondImageUrl
    );


    firstSelectedSlot.classList.remove("selectedswap");
    firstSelectedSlot = null;
    secondSelectedSlot = null;
  }
}

function sendSwapUpdate(firstSlotId, firstImage, secondSlotId, secondImage) {
  const swapData = {
    type: "swapHeroes",
    swaps: [
      { slotId: firstSlotId, image: firstImage },
      { slotId: secondSlotId, image: secondImage },
    ],
  };
  socket.send(JSON.stringify(swapData));
}
document.getElementById("lockButton").addEventListener("click", function () {
  const pickB5 = document.getElementById("pickB5");
  if (pickB5.classList.contains("locked")) {
    enableSwapFunctionality();
  }
});

function extractImageUrl(urlStyle) {

  return urlStyle.replace(/url\(["']?(.*?)["']?\)/, "$1");
}