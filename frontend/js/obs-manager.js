// OBS Manager JavaScript
const obsManager = (function() {
    const obs = new OBSWebSocket();
    
    // --- DATA STORE ---
    let STORE = {
        pinned: [],   // ['sourceName1', 'sourceName2']
        links: {},    // { 'groupName': ['sourceA', 'sourceB'] }
        contents: {}, // { 'sourceName': 'lastKnownContent/url/path' }
        swapPairs: [], // [{ sourceA: 'name1', sourceB: 'name2' }]
        cameraData: {
            players: {
                A: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' },
                B: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' }
            },
            cameras: {
                A: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' },
                B: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' }
            }
        }
    };

    let isStoreLoaded = false;

    // Cache danh sách source sau khi scan
    let CACHED_SCENES = [];
    let currentGroupName = '';
    
    // Swap pair dialog state
    let swapPairDialogState = {
        selectedSourceA: null,
        selectedSourceB: null
    };

    // Auto-rotation state
    let rotationInterval = null;
    let rotationState = {
        enabled: false,
        currentLaneIndex: 0,
        timeRemaining: 15,
        lanes: ['Top', 'Jung', 'Mid', 'ADC', 'Support']
    };

    // --- 1. CONNECTION ---
    async function connectOBS() {
        const btn = document.getElementById('obsBtnConnect');
        try {
            btn.innerText = "...";
            await obs.connect(`ws://${document.getElementById('obsIp').value}:${document.getElementById('obsPort').value}`, document.getElementById('obsPwd').value);
            btn.innerText = "Connected";
            btn.style.background = "#10b981";

            await loadStore();
            loadCameraData();
            scanSources();
            obs.on('CurrentProgramSceneChanged', (data) => {
                highlightActiveScene(data.sceneName);
            });

        } catch (e) {
            alert("Lỗi kết nối: " + e.message);
            btn.innerText = "Connect";
            btn.style.background = "#3b82f6";
        }
    }

    // --- 2. SETUP & SCAN LOGIC ---
    async function scanSources() {
        try {
            const resp = await obs.call('GetSceneList');
            CACHED_SCENES = resp.scenes.reverse(); 
            
            const sceneGrid = document.getElementById('obs-scene-grid');
            
            if (sceneGrid) {
                sceneGrid.innerHTML = '';

                // Render Dashboard Buttons
                CACHED_SCENES.forEach(scene => {
                    const btn = document.createElement('button');
                    btn.className = 'scene-btn';
                    btn.id = `obs-btn-scene-${scene.sceneName}`;
                    btn.innerText = scene.sceneName;
                    btn.onclick = () => obs.call('SetCurrentProgramScene', { sceneName: scene.sceneName });
                    sceneGrid.appendChild(btn);
                });
            }

            renderDashboard(); // Refresh UI Dashboard
            renderLinkGroups(); // Refresh Link Groups
            renderScenesViewer(resp.currentProgramSceneName); // Render Scenes Viewer
        } catch (e) {
            alert("Lỗi quét Scene: " + e.message);
        }
    }

    // --- SCENES/SOURCES VIEWER (Left Panel) ---
    async function renderScenesViewer(currentProgramSceneName) {
        const scenesList = document.getElementById('obs-viewer-scenes-list');
        const sourcesList = document.getElementById('obs-viewer-sources-list');
        
        if (!CACHED_SCENES || CACHED_SCENES.length === 0) {
            scenesList.innerHTML = '<div style="color: #666; padding: 10px;">Chưa quét. Bấm "Quét Source từ OBS"</div>';
            sourcesList.innerHTML = '';
            return;
        }
        
        // Determine which scene to show as active
        const activeScene = currentProgramSceneName || CACHED_SCENES[0]?.sceneName;
        
        // Render scenes
        scenesList.innerHTML = '';
        CACHED_SCENES.forEach(scene => {
            const sceneEl = document.createElement('div');
            sceneEl.className = 'viewer-scene-item' + (scene.sceneName === activeScene ? ' active' : '');
            sceneEl.innerHTML = `<i class="fas fa-image"></i> <span>${scene.sceneName}</span>`;
            sceneEl.onclick = () => selectViewerScene(scene.sceneName);
            scenesList.appendChild(sceneEl);
        });
        
        // Render sources for active scene
        await renderViewerSources(activeScene);
    }

    async function renderViewerSources(sceneName) {
        const sourcesList = document.getElementById('obs-viewer-sources-list');
        
        if (!sceneName) {
            sourcesList.innerHTML = '<div style="color: #666; padding: 10px;">Chọn một scene để xem sources</div>';
            return;
        }
        
        sourcesList.innerHTML = '<div style="color: #888; padding: 10px;">Đang tải...</div>';
        
        try {
            const items = await getItemsRecursively(sceneName);
            
            if (!items || items.length === 0) {
                sourcesList.innerHTML = '<div style="color: #666; padding: 10px;">Scene này chưa có source</div>';
                return;
            }
            
            sourcesList.innerHTML = '';
            
            // Render items với nội dung và tương tác đầy đủ
            for (let item of items) {
                // Chỉ hiển thị Text, Browser, Media, Image
                if(['input', 'scene'].includes(item.sourceType) || item.inputKind) { 
                    const row = document.createElement('div');
                    row.className = 'source-row';
                    
                    const isPinned = STORE.pinned.includes(item.sourceName);
                    const linkGroup = getLinkGroup(item.sourceName);
                    const isGroupItem = item.groupName ? `<span style='color:#e67e22; font-size: 0.65rem;'>[Group: ${item.groupName}]</span>` : '';

                    // Lấy nội dung đầy đủ của source
                    let sourceContent = '';
                    let contentType = '';
                    try {
                        const inputSettings = await obs.call('GetInputSettings', { inputName: item.sourceName });
                        const settings = inputSettings.inputSettings || {};
                        
                        if (settings.text) {
                            sourceContent = String(settings.text || '');
                            contentType = 'text';
                        } else if (settings.url) {
                            sourceContent = String(settings.url || '');
                            contentType = 'url';
                        } else if (settings.local_file) {
                            sourceContent = String(settings.local_file || '');
                            contentType = 'local_file';
                        } else if (settings.file) {
                            sourceContent = String(settings.file || '');
                            contentType = 'file';
                        }
                    } catch(e) {
                        sourceContent = '';
                        contentType = '';
                    }

                    // Lưu lại nội dung vào STORE
                    try {
                        if (!STORE.contents) STORE.contents = {};
                        if (sourceContent) {
                            STORE.contents[item.sourceName] = sourceContent;
                        }
                    } catch (eStore) {
                        console.warn('Không thể lưu contents vào STORE:', eStore);
                    }

                    // Escape HTML
                    const escapedContent = sourceContent.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
                    const escapedTitle = sourceContent.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
                    const escapedSourceNameAttr = item.sourceName.replace(/"/g, '&quot;');
                    const escapedContentTypeAttr = contentType.replace(/"/g, '&quot;');

                    row.innerHTML = `
                        <div class="viewer-source-name-row">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="source-name">${item.sourceName}</span>
                                <span class="obs-badge">${item.inputKind || 'Source'}</span>
                                ${isGroupItem}
                                ${linkGroup ? `<span style="font-size: 0.7rem; color: var(--accent);"><i class="fas fa-link"></i> ${linkGroup}</span>` : ''}
                            </div>
                            <div style="display: flex; gap: 0.3rem;">
                                <button class="obs-icon-btn" 
                                    onclick="obsManagerAPI.updateSourceFromSetupField(this.closest('.source-row').querySelector('.source-content-input'))" 
                                    title="Lưu">
                                    <i class="fas fa-save"></i>
                                </button>
                                <button class="obs-icon-btn ${isPinned?'active':''}" onclick="obsManagerAPI.togglePin('${item.sourceName.replace(/'/g, "\\'")}')" title="Ghim">
                                    <i class="fas fa-thumbtack"></i>
                                </button>
                                <button class="obs-icon-btn ${linkGroup?'linked':''}" onclick="obsManagerAPI.setLink('${item.sourceName.replace(/'/g, "\\'")}')" title="Liên kết">
                                    <i class="fas fa-link"></i>
                                </button>
                                <button class="obs-icon-btn" onclick="obsManagerAPI.toggleVis('${sceneName.replace(/'/g, "\\'")}', ${item.sceneItemId})" title="Ẩn/Hiện">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${ (item.inputKind === 'browser_source') ? 
                                    `<button class="obs-icon-btn" onclick="obsManagerAPI.reloadBrowser('${item.sourceName.replace(/'/g, "\\'")}')" title="Reload Browser">
                                        <i class="fas fa-sync"></i>
                                    </button>` : '' 
                                }
                            </div>
                        </div>

                        <div class="viewer-source-input-row">
                            <input type="text" 
                                class="source-content-input" 
                                value="${escapedContent}" 
                                placeholder="Nội dung/URL/Đường dẫn..."
                                data-source-name="${escapedSourceNameAttr}"
                                data-content-type="${escapedContentTypeAttr}"
                                onchange="obsManagerAPI.updateSourceFromSetupField(this)"
                                onkeydown="if(event.key === 'Enter') { obsManagerAPI.updateSourceFromSetupField(this); this.blur(); }"
                                title="${escapedTitle || 'Không có nội dung'}"
                            >
                        </div>
                    `;
                    sourcesList.appendChild(row);
                }
            }
            
            if (sourcesList.children.length === 0) {
                sourcesList.innerHTML = '<div style="color: #666; padding: 10px;">Không có source hợp lệ</div>';
            }
        } catch (e) {
            console.error('Error loading sources:', e);
            sourcesList.innerHTML = '<div style="color: #ef4444; padding: 10px;">Lỗi tải sources</div>';
        }
    }

    function selectViewerScene(sceneName) {
        // Update active scene in viewer
        document.querySelectorAll('.viewer-scene-item').forEach(el => {
            el.classList.remove('active');
            if (el.textContent.trim() === sceneName) {
                el.classList.add('active');
            }
        });
        
        // Load sources for selected scene
        renderViewerSources(sceneName);
    }

    async function renderSceneItems(sceneName, container) {
        container.innerHTML = '<div style="color:#888; text-align:center">Loading...</div>';
        
        try {
            let items = await getItemsRecursively(sceneName);
            
            container.innerHTML = ''; 
            
            if(items.length === 0) {
                container.innerHTML = '<div style="font-size:12px; padding:5px;">Trống</div>';
                return;
            }

            // Render items với nội dung
            for (let item of items) {
                // Chỉ hiển thị Text, Browser, Media, Image
                if(['input', 'scene'].includes(item.sourceType) || item.inputKind) { 
                     const row = document.createElement('div');
                     row.className = 'source-row';
                     
                     const isPinned = STORE.pinned.includes(item.sourceName);
                     const linkGroup = getLinkGroup(item.sourceName);
                     const isGroupItem = item.groupName ? `<span style='color:#e67e22'>[Group: ${item.groupName}]</span>` : '';

                     // Lấy nội dung đầy đủ của source
                     let sourceContent = '';
                     let contentType = ''; // 'text', 'url', 'local_file', 'file'
                     try {
                         const inputSettings = await obs.call('GetInputSettings', { inputName: item.sourceName });
                         const settings = inputSettings.inputSettings || {};
                         
                         if (settings.text) {
                             sourceContent = String(settings.text || '');
                             contentType = 'text';
                         } else if (settings.url) {
                             sourceContent = String(settings.url || '');
                             contentType = 'url';
                         } else if (settings.local_file) {
                             sourceContent = String(settings.local_file || '');
                             contentType = 'local_file';
                         } else if (settings.file) {
                             sourceContent = String(settings.file || '');
                             contentType = 'file';
                         }
                     } catch(e) {
                         sourceContent = '';
                         contentType = '';
                     }

                     // Lưu lại nội dung vào STORE
                     try {
                         if (!STORE.contents) STORE.contents = {};
                         if (sourceContent) {
                             STORE.contents[item.sourceName] = sourceContent;
                         }
                     } catch (eStore) {
                         console.warn('Không thể lưu contents vào STORE:', eStore);
                     }

                     // Escape HTML
                     const escapedContent = sourceContent.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
                     const escapedTitle = sourceContent.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
                     const escapedSourceNameAttr = item.sourceName.replace(/"/g, '&quot;');
                     const escapedContentTypeAttr = contentType.replace(/"/g, '&quot;');

                     row.innerHTML = `
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:bold; color: white;">${item.sourceName}</span>
                            <span class="obs-badge" style="width:fit-content">${item.inputKind || 'Source'} ${isGroupItem}</span>
                        </div>
                        
                        <div style="font-size: 11px; color: var(--accent);">
                            ${linkGroup ? `<i class="fas fa-link"></i> ${linkGroup}` : ''}
                        </div>

                        <div style="display:flex; gap:5px; align-items:center;">
                            <input type="text" 
                                class="source-content-input" 
                                value="${escapedContent}" 
                                placeholder="Nội dung/URL/Đường dẫn..."
                                data-source-name="${escapedSourceNameAttr}"
                                data-content-type="${escapedContentTypeAttr}"
                                onchange="obsManagerAPI.updateSourceFromSetupField(this)"
                                onkeydown="if(event.key === 'Enter') { obsManagerAPI.updateSourceFromSetupField(this); this.blur(); }"
                                title="${escapedTitle || 'Không có nội dung'}"
                            >
                            <button class="obs-icon-btn" 
                                onclick="obsManagerAPI.updateSourceFromSetupField(this.previousElementSibling)" 
                                title="Lưu"
                                style="flex-shrink: 0;">
                                <i class="fas fa-save"></i>
                            </button>
                        </div>

                        <div style="display:flex; gap:5px;">
                            <button class="obs-icon-btn ${isPinned?'active':''}" onclick="obsManagerAPI.togglePin('${item.sourceName.replace(/'/g, "\\'")}')" title="Ghim">
                                <i class="fas fa-thumbtack"></i>
                            </button>
                            <button class="obs-icon-btn ${linkGroup?'linked':''}" onclick="obsManagerAPI.setLink('${item.sourceName.replace(/'/g, "\\'")}')" title="Liên kết">
                                <i class="fas fa-link"></i>
                            </button>
                        </div>

                        <div style="display:flex; gap:5px; justify-content: flex-end;">
                            <button class="obs-icon-btn" onclick="obsManagerAPI.toggleVis('${sceneName.replace(/'/g, "\\'")}', ${item.sceneItemId})" title="Ẩn/Hiện">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${ (item.inputKind === 'browser_source') ? 
                                `<button class="obs-icon-btn" onclick="obsManagerAPI.reloadBrowser('${item.sourceName.replace(/'/g, "\\'")}')" title="Reload Browser">
                                    <i class="fas fa-sync"></i>
                                </button>` : '' 
                            }
                        </div>
                     `;
                     container.appendChild(row);
                }
            }

        } catch(e) {
            container.innerHTML = `Error: ${e.message}`;
        }
    }

    async function getItemsRecursively(sceneNameOrGroupName, parentGroup = null) {
        let list = [];
        try {
            const resp = await obs.call('GetSceneItemList', { sceneName: sceneNameOrGroupName });
            
            for (let item of resp.sceneItems) {
                item.groupName = parentGroup;
                
                if (item.isGroup) {
                    list.push(item);
                    try {
                        const subItems = await getItemsRecursively(item.sourceName, item.sourceName);
                        list = list.concat(subItems);
                    } catch (errGroup) {
                        console.warn(`Không thể chui vào group ${item.sourceName}`, errGroup);
                    }
                } else {
                    list.push(item);
                }
            }
        } catch (e) {
            console.warn(`Skip quét: ${sceneNameOrGroupName} không phải là scene/group hợp lệ.`);
        }
        return list;
    }

    // --- 3. PIN & LINK LOGIC ---
    function togglePin(sourceName) {
        if(STORE.pinned.includes(sourceName)) {
            STORE.pinned = STORE.pinned.filter(s => s !== sourceName);
        } else {
            STORE.pinned.push(sourceName);
        }
        saveStore();
        const btn = event.currentTarget;
        btn.classList.toggle('active');
        renderDashboard();
    }

    function setLink(sourceName) {
        const currentGroup = getLinkGroup(sourceName);
        const newGroup = prompt("Nhập tên nhóm liên kết (nội dung):", currentGroup || "");
        if(newGroup === null) return; 
        
        if(currentGroup) {
            STORE.links[currentGroup] = STORE.links[currentGroup].filter(s => s !== sourceName);
            if(STORE.links[currentGroup].length === 0) delete STORE.links[currentGroup];
        }

        if(newGroup.trim() !== "") {
            if(!STORE.links[newGroup]) STORE.links[newGroup] = [];
            STORE.links[newGroup].push(sourceName);
        }
        saveStore();
        const btn = event.currentTarget;
        if(newGroup) btn.classList.add('linked'); else btn.classList.remove('linked');
        renderDashboard();
        renderLinkGroups();
    }

    function getLinkGroup(sourceName) {
        for(let group in STORE.links) {
            if(STORE.links[group].includes(sourceName)) return group;
        }
        return null;
    }

    // --- LINK GROUPS MANAGEMENT ---
    function renderLinkGroups() {
        const container = document.getElementById('obs-link-groups-container');
        if (!container) return;
        container.innerHTML = '';

        const groups = Object.keys(STORE.links);
        if(groups.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Chưa có nhóm liên kết nào. Tạo nhóm bằng cách click nút <i class="fas fa-link"></i> ở source trong danh sách bên dưới.</div>';
            return;
        }

        groups.forEach(groupName => {
            const sources = STORE.links[groupName] || [];
            const groupEl = document.createElement('div');
            groupEl.className = 'link-group-item';
            
            groupEl.innerHTML = `
                <div class="link-group-header">
                    <div class="link-group-title">${groupName.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</div>
                    <button class="add-source-btn" onclick="obsManagerAPI.openSourcePickerForGroup('${groupName.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" title="Thêm source vào nhóm">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="link-group-sources">
                    ${sources.map(sourceName => `
                        <div class="source-tag">
                            <span>${sourceName}</span>
                            <span class="remove-btn" onclick="obsManagerAPI.removeSourceFromGroup('${groupName.replace(/'/g, "\\'")}', '${sourceName.replace(/'/g, "\\'")}')" title="Xóa">
                                <i class="fas fa-times"></i>
                            </span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(groupEl);
        });
    }

    function removeSourceFromGroup(groupName, sourceName) {
        if(confirm(`Bạn có chắc muốn xóa "${sourceName}" khỏi nhóm "${groupName}"?`)) {
            if(STORE.links[groupName]) {
                STORE.links[groupName] = STORE.links[groupName].filter(s => s !== sourceName);
                if(STORE.links[groupName].length === 0) {
                    delete STORE.links[groupName];
                }
                saveStore();
                renderLinkGroups();
                renderDashboard();
            }
        }
    }

    // --- SWAP PAIRS MANAGEMENT ---
    function renderSwapPairs() {
        const container = document.getElementById('obs-swap-pairs-container');
        if (!container) return;
        
        if (!STORE.swapPairs || STORE.swapPairs.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Chưa có cặp swap nào. Click "Thêm Cặp Swap" để tạo.</div>';
            return;
        }
        
        container.innerHTML = '';
        STORE.swapPairs.forEach((pair, index) => {
            const pairEl = document.createElement('div');
            pairEl.className = 'swap-pair-item';
            pairEl.innerHTML = `
                <div class="swap-pair-sources">
                    <span style="color: #3b82f6;">${pair.sourceA}</span>
                    <span class="swap-pair-arrow">⇄</span>
                    <span style="color: #ef4444;">${pair.sourceB}</span>
                </div>
                <button class="obs-icon-btn" onclick="obsManagerAPI.removeSwapPair(${index})" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(pairEl);
        });
    }

    function openSwapPairDialog() {
        swapPairDialogState = { selectedSourceA: null, selectedSourceB: null };
        document.getElementById('obsSwapPairDialogOverlay').classList.add('active');
        renderSwapPairSourceLists();
    }

    function closeSwapPairDialog() {
        document.getElementById('obsSwapPairDialogOverlay').classList.remove('active');
        swapPairDialogState = { selectedSourceA: null, selectedSourceB: null };
    }

    async function renderSwapPairSourceLists() {
        const allSources = await getAllAvailableSources();
        
        renderSwapPairColumn('swapPairTeamA', allSources, 'A');
        renderSwapPairColumn('swapPairTeamB', allSources, 'B');
    }

    function renderSwapPairColumn(containerId, sources, team) {
        const container = document.getElementById(containerId);
        const listEl = document.createElement('div');
        listEl.className = 'swap-source-list';
        
        sources.forEach(source => {
            const itemEl = document.createElement('div');
            itemEl.className = 'swap-source-item';
            itemEl.textContent = source;
            itemEl.onclick = () => selectSwapSource(team, source, itemEl);
            listEl.appendChild(itemEl);
        });
        
        container.innerHTML = '';
        container.appendChild(listEl);
    }

    function selectSwapSource(team, sourceName, element) {
        const container = element.parentElement;
        container.querySelectorAll('.swap-source-item').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        
        if (team === 'A') {
            swapPairDialogState.selectedSourceA = sourceName;
        } else {
            swapPairDialogState.selectedSourceB = sourceName;
        }
    }

    async function getAllAvailableSources() {
        const sources = [];
        for (const scene of CACHED_SCENES) {
            try {
                const resp = await obs.call('GetSceneItemList', { sceneName: scene.sceneName });
                resp.sceneItems.forEach(item => {
                    if (item.sourceName && !sources.includes(item.sourceName)) {
                        sources.push(item.sourceName);
                    }
                });
            } catch (e) {
                console.error('Error loading sources:', e);
            }
        }
        return sources.sort();
    }

    function saveSwapPair() {
        const { selectedSourceA, selectedSourceB } = swapPairDialogState;
        
        if (!selectedSourceA || !selectedSourceB) {
            alert('Vui lòng chọn cả 2 source!');
            return;
        }
        
        if (selectedSourceA === selectedSourceB) {
            alert('Không thể swap một source với chính nó!');
            return;
        }
        
        // Check for duplicates
        const isDuplicate = STORE.swapPairs.some(pair => 
            pair.sourceA === selectedSourceA || pair.sourceB === selectedSourceA ||
            pair.sourceA === selectedSourceB || pair.sourceB === selectedSourceB
        );
        
        if (isDuplicate) {
            alert('Một trong hai source này đã nằm trong cặp swap khác!');
            return;
        }
        
        if (!STORE.swapPairs) STORE.swapPairs = [];
        STORE.swapPairs.push({ sourceA: selectedSourceA, sourceB: selectedSourceB });
        
        saveStore();
        renderSwapPairs();
        closeSwapPairDialog();
    }

    function removeSwapPair(index) {
        if (confirm('Bạn có chắc muốn xóa cặp swap này?')) {
            STORE.swapPairs.splice(index, 1);
            saveStore();
            renderSwapPairs();
        }
    }

    // --- SWAP EXECUTION ---
    async function executeSwapPairs() {
        if (!STORE.swapPairs || STORE.swapPairs.length === 0) {
            return; // No swap pairs to execute
        }
        
        try {
            for (const pair of STORE.swapPairs) {
                await swapSourceContents(pair.sourceA, pair.sourceB);
            }
            console.log('Đã swap toàn bộ swap pairs');
        } catch (e) {
            console.error('Lỗi khi swap sources:', e);
            alert('Có lỗi xảy ra khi swap sources: ' + e.message);
        }
    }

    async function swapSourceContents(sourceNameA, sourceNameB) {
        // Get link groups for both sources
        const groupA = getLinkGroup(sourceNameA);
        const groupB = getLinkGroup(sourceNameB);
        
        // Determine targets for each source
        const targetsA = groupA && STORE.links[groupA] ? STORE.links[groupA] : [sourceNameA];
        const targetsB = groupB && STORE.links[groupB] ? STORE.links[groupB] : [sourceNameB];
        
        // Get current content of both sources
        const contentA = STORE.contents[sourceNameA] || '';
        const contentB = STORE.contents[sourceNameB] || '';
        
        // Get source settings to determine content type
        let settingsA, settingsB;
        try {
            settingsA = await obs.call('GetInputSettings', { inputName: sourceNameA });
            settingsB = await obs.call('GetInputSettings', { inputName: sourceNameB });
        } catch (e) {
            console.warn('Could not get source settings:', e);
            return;
        }
        
        // Prepare input settings for swap
        const inputSettingsA = prepareInputSettings(settingsB.inputSettings, contentB);
        const inputSettingsB = prepareInputSettings(settingsA.inputSettings, contentA);
        
        // Update all targets in group A with content from B
        for (const target of targetsA) {
            await obs.call('SetInputSettings', {
                inputName: target,
                inputSettings: inputSettingsA
            });
            STORE.contents[target] = contentB;
        }
        
        // Update all targets in group B with content from A
        for (const target of targetsB) {
            await obs.call('SetInputSettings', {
                inputName: target,
                inputSettings: inputSettingsB
            });
            STORE.contents[target] = contentA;
        }
        
        saveStore();
    }

    function prepareInputSettings(settings, content) {
        const inputSettings = {};
        
        if (settings.text !== undefined) inputSettings.text = content;
        if (settings.url !== undefined) inputSettings.url = content;
        if (settings.local_file !== undefined) inputSettings.local_file = content;
        if (settings.file !== undefined) inputSettings.file = content;
        
        // If no recognized content field, try all
        if (Object.keys(inputSettings).length === 0) {
            inputSettings.text = content;
            inputSettings.url = content;
            inputSettings.local_file = content;
            inputSettings.file = content;
        }
        
        return inputSettings;
    }

    function openSourcePickerForGroup(groupName) {
        currentGroupName = groupName;
        const titleEl = document.getElementById('obsSourcePickerTitle');
        titleEl.textContent = `Thêm Source vào: ${groupName}`;
        document.getElementById('obsSourcePickerOverlay').classList.add('active');
        document.getElementById('obsSourcePickerSidebar').classList.add('active');
        
        renderScenesList();
        document.getElementById('obs-sources-column').innerHTML = `
            <div class="column-title">Sources</div>
            <div style="color: #666; font-size: 12px; padding: 10px;">Chọn một scene để xem sources</div>
        `;
    }

    function closeSourcePicker() {
        document.getElementById('obsSourcePickerOverlay').classList.remove('active');
        document.getElementById('obsSourcePickerSidebar').classList.remove('active');
        currentGroupName = '';
    }

    function renderScenesList() {
        const container = document.getElementById('obs-scenes-list-container');
        if (!container) return;
        container.innerHTML = '';

        if(CACHED_SCENES.length === 0) {
            container.innerHTML = '<div style="color: #666; font-size: 12px; padding: 10px;">Chưa có scene nào. Hãy quét lại.</div>';
            return;
        }

        CACHED_SCENES.forEach(scene => {
            const sceneEl = document.createElement('div');
            sceneEl.className = 'scene-list-item';
            sceneEl.textContent = scene.sceneName;
            sceneEl.onmouseenter = () => loadSourcesForScene(scene.sceneName);
            sceneEl.onclick = () => {
                document.querySelectorAll('.scene-list-item').forEach(el => el.classList.remove('active'));
                sceneEl.classList.add('active');
            };
            container.appendChild(sceneEl);
        });
    }

    async function loadSourcesForScene(sceneName) {
        const container = document.getElementById('obs-sources-column');
        container.innerHTML = '<div class="column-title">Sources</div><div style="color: #888; font-size: 12px; padding: 10px;">Đang tải...</div>';

        try {
            const items = await getItemsRecursively(sceneName);
            const sourcesInGroup = STORE.links[currentGroupName] || [];

            container.innerHTML = '<div class="column-title">Sources</div>';

            if(items.length === 0) {
                container.innerHTML += '<div style="color: #666; font-size: 12px; padding: 10px;">Scene này không có source nào.</div>';
                return;
            }

            const validItems = items.filter(item => 
                (['input', 'scene'].includes(item.sourceType) || item.inputKind)
            );

            if(validItems.length === 0) {
                container.innerHTML += '<div style="color: #666; font-size: 12px; padding: 10px;">Không có source hợp lệ.</div>';
                return;
            }

            validItems.forEach(item => {
                const isAlreadyAdded = sourcesInGroup.includes(item.sourceName);
                const sourceEl = document.createElement('div');
                sourceEl.className = 'source-list-item' + (isAlreadyAdded ? ' added' : '');
                sourceEl.innerHTML = `
                    <div>
                        <div style="font-weight: 600; color: white; font-size: 13px;">${item.sourceName}</div>
                        <div style="font-size: 11px; color: #aaa;">${item.inputKind || 'Source'}</div>
                    </div>
                    ${isAlreadyAdded ? '<span style="color: var(--success);"><i class="fas fa-check"></i> Đã thêm</span>' : ''}
                `;
                
                if(!isAlreadyAdded) {
                    sourceEl.onclick = () => addSourceToGroup(currentGroupName, item.sourceName);
                }
                
                container.appendChild(sourceEl);
            });
        } catch(e) {
            container.innerHTML = `<div style="color: var(--danger); font-size: 12px; padding: 10px;">Lỗi: ${e.message}</div>`;
        }
    }

    function addSourceToGroup(groupName, sourceName) {
        if(!STORE.links[groupName]) {
            STORE.links[groupName] = [];
        }
        
        if(!STORE.links[groupName].includes(sourceName)) {
            STORE.links[groupName].push(sourceName);
            saveStore();
            renderLinkGroups();
            renderDashboard();
            
            const activeScene = document.querySelector('.scene-list-item.active');
            if(activeScene) {
                loadSourcesForScene(activeScene.textContent);
            } else {
                const hoveredScene = document.querySelector('.scene-list-item:hover');
                if(hoveredScene) {
                    loadSourcesForScene(hoveredScene.textContent);
                }
            }
        }
    }

    // --- 4. DASHBOARD RENDER & ACTIONS ---
    async function renderDashboard() {
        const container = document.getElementById('obs-pinned-container');
        if (!container) return;
        container.innerHTML = '';

        if(STORE.pinned.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #666; margin-top: 20px;">Chưa ghim source nào.</div>';
            return;
        }

        if (!STORE.contents) STORE.contents = {};

        let hasNewContent = false;
        for (let sourceName of STORE.pinned) {
            if (!STORE.contents[sourceName] || STORE.contents[sourceName] === '') {
                try {
                    const inputSettings = await obs.call('GetInputSettings', { inputName: sourceName });
                    const settings = inputSettings.inputSettings || {};
                    
                    if (settings.text) {
                        STORE.contents[sourceName] = String(settings.text || '');
                        hasNewContent = true;
                    } else if (settings.url) {
                        STORE.contents[sourceName] = String(settings.url || '');
                        hasNewContent = true;
                    } else if (settings.local_file) {
                        STORE.contents[sourceName] = String(settings.local_file || '');
                        hasNewContent = true;
                    } else if (settings.file) {
                        STORE.contents[sourceName] = String(settings.file || '');
                        hasNewContent = true;
                    } else {
                        STORE.contents[sourceName] = '';
                    }
                } catch(e) {
                    console.warn(`Không thể load nội dung cho ${sourceName}:`, e);
                    STORE.contents[sourceName] = '';
                }
            }
        }
        if (hasNewContent) {
            saveStore();
        }

        STORE.pinned.forEach(sourceName => {
            const group = getLinkGroup(sourceName);
            const currentValue = STORE.contents[sourceName] || '';
            const escapedValue = String(currentValue).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const escapedSourceName = sourceName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            const el = document.createElement('div');
            el.className = 'pinned-item';
            
            let html = `
                <div class="pinned-header">
                    <span style="font-weight:bold; color:white; font-size:14px;">${sourceName}</span>
                    ${group ? `<span class="obs-badge" style="background:var(--accent); color:white">${group}</span>` : ''}
                </div>
                <div style="margin-bottom:5px;">
                    <input type="text" class="obs-input-dark" placeholder="Nội dung/URL..." 
                        value="${escapedValue}"
                        onchange="obsManagerAPI.updateSourceContent('${escapedSourceName}', this.value)"
                        onkeydown="if(event.key === 'Enter') obsManagerAPI.updateSourceContent('${escapedSourceName}', this.value)"
                        title="${escapedValue || 'Không có nội dung'}"
                    >
                </div>
                <div class="pinned-controls">
                    <button class="obs-btn-sm" style="background:#333; color:white; width:40px" 
                            onclick="obsManagerAPI.toggleSourceVisiblityLinked('${escapedSourceName}')" title="Ẩn/Hiện (Linked)">
                        <i class="fas fa-eye"></i>
                    </button>
                    
                    <button class="obs-btn-sm" style="background:#333; color:white; flex:1" 
                            onclick="obsManagerAPI.reloadBrowser('${escapedSourceName}')">
                        <i class="fas fa-sync"></i> Reload ${group ? '(All)' : ''}
                    </button>
                </div>
            `;
            el.innerHTML = html;
            container.appendChild(el);
        });
    }

    // --- CORE ACTION FUNCTIONS ---
    async function updateSourceContent(sourceName, value) {
        const group = getLinkGroup(sourceName);
        let targets = [sourceName];

        if(group && STORE.links[group]) {
            targets = STORE.links[group];
        }

        try {
            const promises = targets.map(name => 
                obs.call('SetInputSettings', {
                    inputName: name,
                    inputSettings: { 
                        text: value,         
                        url: value,          
                        local_file: value    
                    }
                })
            );
            
            await Promise.all(promises);

            if (!STORE.contents) STORE.contents = {};
            targets.forEach(name => {
                STORE.contents[name] = value;
            });
            saveStore();

            const inputs = document.querySelectorAll('.obs-input-dark');
            inputs.forEach(i => { if(i.value === value) i.style.borderColor = '#10b981'; });
            setTimeout(() => inputs.forEach(i => i.style.borderColor = '#444'), 1000);
        } catch(e) {
            console.error(e);
        }
    }

    async function updateSourceFromSetupField(inputElement) {
        const sourceName = inputElement.getAttribute('data-source-name');
        const contentType = inputElement.getAttribute('data-content-type');
        const value = inputElement.value;
        await updateSourceFromSetup(sourceName, contentType, value);
    }

    async function updateSourceFromSetup(sourceName, contentType, value) {
        value = value || '';

        const group = getLinkGroup(sourceName);
        let targets = [sourceName];

        if(group && STORE.links[group]) {
            targets = STORE.links[group];
        }

        let inputSettings = {};
        
        if (contentType === 'text') {
            inputSettings = { text: value };
        } else if (contentType === 'url') {
            inputSettings = { url: value };
        } else if (contentType === 'local_file') {
            inputSettings = { local_file: value };
        } else if (contentType === 'file') {
            inputSettings = { file: value };
        } else {
            inputSettings = { 
                text: value,
                url: value,
                local_file: value,
                file: value
            };
        }

        try {
            const promises = targets.map(name => 
                obs.call('SetInputSettings', {
                    inputName: name,
                    inputSettings: inputSettings
                })
            );
            
            await Promise.all(promises);
            
            if (!STORE.contents) STORE.contents = {};
            targets.forEach(name => {
                STORE.contents[name] = value;
            });
            saveStore();
            
            const inputs = document.querySelectorAll(`input[data-source-name="${sourceName}"]`);
            inputs.forEach(input => {
                input.style.borderColor = '#10b981';
                setTimeout(() => {
                    input.style.borderColor = '#444';
                }, 1500);
            });
            
            console.log(`Đã cập nhật ${targets.length} source(s): ${targets.join(', ')}`);
        } catch(e) {
            console.error('Lỗi cập nhật source:', e);
            alert('Lỗi cập nhật: ' + e.message);
        }
    }

    async function updateHighlight() {
        try {
            // Get source name and video path from inputs
            const sourceNameInput = document.getElementById('obs-highlight-source-name');
            const videoPathInput = document.getElementById('obs-highlight-path');
            
            if(!sourceNameInput || !videoPathInput) {
                showNotification('Không tìm thấy input fields!', 'error');
                return;
            }
            
            const sourceName = sourceNameInput.value.trim();
            const videoPath = videoPathInput.value.trim();
            
            if(!sourceName) {
                showNotification('Vui lòng nhập tên source video highlight!', 'warning');
                return;
            }
            
            if(!videoPath) {
                showNotification('Vui lòng nhập đường dẫn file video!', 'warning');
                return;
            }
            
            // Update the video source in OBS
            await obs.call('SetInputSettings', {
                inputName: sourceName,
                inputSettings: {
                    local_file: videoPath,
                    file: videoPath
                }
            });
            
            // Visual feedback
            videoPathInput.style.borderColor = '#10b981';
            setTimeout(() => {
                videoPathInput.style.borderColor = '#444';
            }, 1500);
            
            console.log(`Đã cập nhật video highlight cho source "${sourceName}": ${videoPath}`);
            showNotification('✅ Video highlight đã được cập nhật!', 'success');
            
        } catch(e) {
            console.error('Lỗi cập nhật highlight:', e);
            showNotification(`Lỗi: ${e.message}`, 'error');
        }
    }

    async function reloadBrowser(sourceName) {
        const group = getLinkGroup(sourceName);
        const targets = (group && STORE.links[group]) ? STORE.links[group] : [sourceName];

        try {
            const promises = targets.map(name => 
                obs.call('PressInputPropertiesButton', { 
                    inputName: name, 
                    propertyName: 'refreshnocache' 
                })
            );
            
            await Promise.all(promises);
            console.log(`Đã reload: ${targets.join(', ')}`);
        } catch(e) { 
            alert("Lỗi reload (Có thể source không phải browser): " + e.message); 
        }
    }

    async function toggleSourceVisiblityLinked(sourceName) {
        const group = getLinkGroup(sourceName);
        const targets = (group && STORE.links[group]) ? STORE.links[group] : [sourceName];

        try {
            const currentScene = await obs.call('GetCurrentProgramScene');
            const currentSceneName = currentScene.currentProgramSceneName;

            const sceneItemsResp = await obs.call('GetSceneItemList', { sceneName: currentSceneName });
            
            const itemsToToggle = sceneItemsResp.sceneItems.filter(item => targets.includes(item.sourceName));

            if(itemsToToggle.length === 0) {
                alert(`Các source "${targets.join(',')}" không có mặt trong Scene hiện tại (${currentSceneName}) nên không thể ẩn/hiện.`);
                return;
            }

            const isEnabled = itemsToToggle[0].sceneItemEnabled;
            const newState = !isEnabled;

            const promises = itemsToToggle.map(item => 
                obs.call('SetSceneItemEnabled', {
                    sceneName: currentSceneName,
                    sceneItemId: item.sceneItemId,
                    sceneItemEnabled: newState
                })
            );
            
            await Promise.all(promises);

        } catch(e) {
            console.error(e);
            alert("Lỗi toggle visibility: " + e.message);
        }
    }

    async function toggleVis(sceneName, itemId) {
        try {
            const item = await obs.call('GetSceneItemEnabled', { sceneName, sceneItemId: itemId });
            await obs.call('SetSceneItemEnabled', { sceneName, sceneItemId: itemId, sceneItemEnabled: !item.sceneItemEnabled });
        } catch(e) { console.error(e); }
    }

    async function saveReplayBuffer() {
        try {
            // Save replay buffer in OBS
            await obs.call('SaveReplayBuffer');
            console.log('Replay buffer saved!');
            
            // Get highlight folder from input
            const folderInput = document.getElementById('obs-highlight-folder');
            const highlightFolder = folderInput ? folderInput.value.trim() : '';
            
            if (!highlightFolder) {
                showNotification('Đã lưu Buffer! Nhưng chưa nhập thư mục highlight.', 'warning');
                return;
            }
            
            // Show loading message
            const pathInput = document.getElementById('obs-highlight-path');
            if (pathInput) {
                pathInput.value = 'Đang tìm file mới nhất...';
                pathInput.style.borderColor = '#f59e0b';
            }
            
            // Wait a bit for file to be written
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Call API to get latest file
            try {
                const result = await API.post('/api/obs/latest-file', { directory: highlightFolder });
                const filePath = result.filePath;
                
                // Update input field
                if (pathInput) {
                    pathInput.value = filePath;
                    pathInput.style.borderColor = '#10b981';
                    setTimeout(() => {
                        pathInput.style.borderColor = '#444';
                    }, 2000);
                }
                
                // Automatically update highlight source
                await updateHighlightInternal(filePath);
                
                showNotification(`✅ Highlight đã được cập nhật! ${result.fileName}`, 'success');
            } catch (err) {
                showNotification(err.message || 'Đã lưu Buffer nhưng không tìm thấy file mới', 'error');
                if (pathInput) pathInput.value = '';
            }
            
        } catch (e) {
            console.error('Error saving replay buffer:', e);
            showNotification(`Lỗi: ${e.message}`, 'error');
            const pathInput = document.getElementById('obs-highlight-path');
            if (pathInput) {
                pathInput.value = '';
                pathInput.style.borderColor = '#ef4444';
            }
        }
    }
    
    // Internal function to update highlight without alert
    async function updateHighlightInternal(videoPath) {
        try {
            const sourceNameInput = document.getElementById('obs-highlight-source-name');
            
            if (!sourceNameInput) {
                throw new Error('Không tìm thấy input source name');
            }
            
            const sourceName = sourceNameInput.value.trim();
            
            if (!sourceName) {
                throw new Error('Chưa nhập tên source video highlight');
            }
            
            // Update the video source in OBS
            await obs.call('SetInputSettings', {
                inputName: sourceName,
                inputSettings: {
                    local_file: videoPath,
                    file: videoPath
                }
            });
            
            console.log(`Đã cập nhật video highlight cho source "${sourceName}": ${videoPath}`);
            
        } catch (e) {
            console.error('Error updating highlight internally:', e);
            throw e;
        }
    }

    function highlightActiveScene(name) {
        document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`obs-btn-scene-${name}`);
        if(btn) btn.classList.add('active');
    }

    function switchOBSView(viewId) {
        document.querySelectorAll('.obs-view').forEach(v => v.classList.remove('active'));
        const view = document.getElementById(viewId);
        if(view) view.classList.add('active');
        
        document.querySelectorAll('.obs-tab').forEach(t => t.classList.remove('active'));
        const tab = document.querySelector(`[data-obs-view="${viewId}"]`);
        if(tab) tab.classList.add('active');
    }

    async function saveStore() {
        if (!isStoreLoaded) {
            console.warn('Bỏ qua saveStore() vì cấu hình chưa được tải hoàn tất từ database.');
            return;
        }
        try {
            const result = await API.post('/api/obs/config', {
                pinned: STORE.pinned || [],
                links: STORE.links || {},
                contents: STORE.contents || {},
                swapPairs: STORE.swapPairs || []
            });

            if (result.success) {
                console.log('Đã lưu cấu hình OBS vào database');
                localStorage.setItem('obs_tool_store', JSON.stringify(STORE));
            }
        } catch (e) {
            console.warn('Lỗi khi lưu vào database, lưu vào localStorage:', e);
            localStorage.setItem('obs_tool_store', JSON.stringify(STORE));
        }
    }

    async function loadStore() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                // Fallback to localStorage if not authenticated
                console.warn('Không có token, load từ localStorage');
                const s = localStorage.getItem('obs_tool_store');
                if(s) {
                    try {
                        STORE = JSON.parse(s);
                    } catch (e) {
                        console.warn('Không thể parse STORE từ localStorage, dùng cấu trúc mặc định.', e);
                    }
                }
            } else {
                // Load from database
                const result = await API.get('/api/obs/config');

                if (result.success && result.data) {
                    STORE = {
                        pinned: result.data.pinned || [],
                        links: result.data.links || {},
                        contents: result.data.contents || {},
                        swapPairs: result.data.swapPairs || [],
                        cameraData: {
                            players: {
                                A: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' },
                                B: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' }
                            },
                            cameras: {
                                A: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' },
                                B: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' }
                            }
                        }
                    };
                    console.log('Đã load cấu hình OBS từ database');
                    localStorage.setItem('obs_tool_store', JSON.stringify(STORE));
                    renderLinkGroups();
                    renderSwapPairs();
                    isStoreLoaded = true;
                    return;
                }
            }
        } catch (e) {
            console.warn('Lỗi khi load từ database, load từ localStorage:', e);
            const s = localStorage.getItem('obs_tool_store');
            if(s) {
                try {
                    STORE = JSON.parse(s);
                } catch (e) {
                    console.warn('Không thể parse STORE từ localStorage, dùng cấu trúc mặc định.', e);
                }
            }
        }
        
        // Ensure default structure
        if (!STORE.pinned) STORE.pinned = [];
        if (!STORE.links) STORE.links = {};
        if (!STORE.contents) STORE.contents = {};
        if (!STORE.swapPairs) STORE.swapPairs = [];
        if (!STORE.cameraData) {
            STORE.cameraData = {
                players: {
                    A: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' },
                    B: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' }
                },
                cameras: {
                    A: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' },
                    B: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' }
                }
            };
        }
        
        renderSwapPairs();
        isStoreLoaded = true;
    }

    function stopCamera() {
        const video = document.getElementById('obsCamPreview');
        if(video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            
            // Reset button
            const btn = document.getElementById('obsCameraBtn');
            if(btn) {
                btn.innerHTML = 'Bật Cam';
                btn.disabled = false;
            }
            
            console.log('Đã dừng camera');
        }
    }

    // --- CAMERA MANAGEMENT FUNCTIONS ---
    
    // Lane mapping: Pick slot ID to lane name
    const LANE_MAP = {
        A: {
            'pickA1': 'Top',
            'pickA2': 'Jung',
            'pickA3': 'Mid',
            'pickA4': 'ADC',
            'pickA5': 'Support'
        },
        B: {
            'pickB5': 'Top',      // Team B has reverse order
            'pickB4': 'Jung',
            'pickB3': 'Mid',
            'pickB2': 'ADC',
            'pickB1': 'Support'
        }
    };

    function loadPlayerNamesFromPicks() {
        // Get player names from pick slots
        const teams = ['A', 'B'];
        let updated = false;

        teams.forEach(team => {
            Object.keys(LANE_MAP[team]).forEach(pickId => {
                const lane = LANE_MAP[team][pickId];
                const pickSlot = document.getElementById(pickId);
                
                if (pickSlot) {
                    const playerNameEl = pickSlot.querySelector('.player-name');
                    if (playerNameEl && playerNameEl.textContent.trim()) {
                        const playerName = playerNameEl.textContent.trim();
                        if (playerName && playerName !== 'Trống' && playerName !== '') {
                            STORE.cameraData.players[team][lane] = playerName;
                            
                            // Update input field
                            const inputEl = document.getElementById(`playerName_${team}_${lane}`);
                            if (inputEl) {
                                inputEl.value = playerName;
                            }
                            updated = true;
                        }
                    }
                }
            });
        });

        if (updated) {
            saveStore();
            alert('Đã tải tên tuyển thủ từ Pick slots!');
        } else {
            alert('Không tìm thấy tên tuyển thủ trong Pick slots. Hãy đảm bảo bạn đã nhập tên trong Ban/Pick Manager.');
        }
    }

    function updatePlayerNameFromInput(team, lane, newName) {
        STORE.cameraData.players[team][lane] = newName;
        
        // Also update the pick slot
        const pickId = Object.keys(LANE_MAP[team]).find(key => LANE_MAP[team][key] === lane);
        if (pickId) {
            const pickSlot = document.getElementById(pickId);
            if (pickSlot) {
                const playerNameEl = pickSlot.querySelector('.player-name');
                if (playerNameEl) {
                    playerNameEl.textContent = newName || '';
                    
                    // Broadcast update via WebSocket
                    if (window.socketService && window.socketService.isConnected) {
                        // Get all player names to broadcast
                        const allNames = [];
                        ['A', 'B'].forEach(t => {
                            ['Top', 'Jung', 'Mid', 'ADC', 'Support'].forEach(l => {
                                allNames.push(STORE.cameraData.players[t][l] || '');
                            });
                        });
                        
                        window.socketService.send({ 
                            type: 'updateNames', 
                            names: allNames 
                        });
                    }
                }
            }
        }
        
        saveStore();
    }

    function saveCameraData() {
        // Save camera links from input fields (only to localStorage)
        const teams = ['A', 'B'];
        const lanes = ['Top', 'Jung', 'Mid', 'ADC', 'Support'];

        teams.forEach(team => {
            lanes.forEach(lane => {
                const nameInput = document.getElementById(`playerName_${team}_${lane}`);
                const linkInput = document.getElementById(`cameraLink_${team}_${lane}`);
                
                if (nameInput) {
                    STORE.cameraData.players[team][lane] = nameInput.value || '';
                }
                if (linkInput) {
                    STORE.cameraData.cameras[team][lane] = linkInput.value || '';
                }
            });
        });

        // Save only to localStorage (not database)
        localStorage.setItem('camera_data', JSON.stringify(STORE.cameraData));
        alert('Đã lưu thông tin camera vào localStorage!');
    }

    function loadCameraData() {
        // Load camera data from localStorage only
        try {
            const savedData = localStorage.getItem('camera_data');
            if (savedData) {
                STORE.cameraData = JSON.parse(savedData);
            }
        } catch (e) {
            console.warn('Failed to load camera data from localStorage:', e);
        }

        // Ensure default structure
        if (!STORE.cameraData) {
            STORE.cameraData = {
                players: {
                    A: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' },
                    B: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' }
                },
                cameras: {
                    A: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' },
                    B: { Top: '', Jung: '', Mid: '', ADC: '', Support: '' }
                }
            };
        }

        // Load into input fields
        const teams = ['A', 'B'];
        const lanes = ['Top', 'Jung', 'Mid', 'ADC', 'Support'];

        teams.forEach(team => {
            lanes.forEach(lane => {
                const nameInput = document.getElementById(`playerName_${team}_${lane}`);
                const linkInput = document.getElementById(`cameraLink_${team}_${lane}`);
                
                if (nameInput && STORE.cameraData.players && STORE.cameraData.players[team]) {
                    nameInput.value = STORE.cameraData.players[team][lane] || '';
                }
                if (linkInput && STORE.cameraData.cameras && STORE.cameraData.cameras[team]) {
                    linkInput.value = STORE.cameraData.cameras[team][lane] || '';
                }
            });
        });
    }

    function selectLane(lane) {
        // Remove active class from all lane buttons
        document.querySelectorAll('.camera-lane-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to clicked lane buttons
        document.querySelectorAll(`.camera-lane-btn.lane-${lane.toLowerCase()}`).forEach(btn => {
            btn.classList.add('active');
        });

        // Get latest data from input fields
        const teams = ['A', 'B'];
        teams.forEach(team => {
            const nameInput = document.getElementById(`playerName_${team}_${lane}`);
            const linkInput = document.getElementById(`cameraLink_${team}_${lane}`);
            
            if (nameInput) {
                STORE.cameraData.players[team][lane] = nameInput.value || '';
            }
            if (linkInput) {
                STORE.cameraData.cameras[team][lane] = linkInput.value || '';
            }
        });

        // Prepare data for WebSocket broadcast with image detection
        const teamALink = STORE.cameraData.cameras.A[lane] || '';
        const teamBLink = STORE.cameraData.cameras.B[lane] || '';
        
        const teamAData = {
            playerName: STORE.cameraData.players.A[lane] || '',
            cameraLink: teamALink,
            isImage: isImageLink(teamALink)
        };

        const teamBData = {
            playerName: STORE.cameraData.players.B[lane] || '',
            cameraLink: teamBLink,
            isImage: isImageLink(teamBLink)
        };

        // Broadcast via WebSocket
        if (window.banpickSocket && window.banpickSocket.readyState === WebSocket.OPEN) {
            window.banpickSocket.send(JSON.stringify({
                type: 'selectLane',
                lane: lane,
                teamA: teamAData,
                teamB: teamBData
            }));
            
            console.log(`Selected lane: ${lane}`, { 
                teamA: { ...teamAData, isImage: teamAData.isImage ? '✓' : '✗' }, 
                teamB: { ...teamBData, isImage: teamBData.isImage ? '✓' : '✗' } 
            });
        } else {
            console.warn('WebSocket not connected. Cannot broadcast lane selection.');
        }
    }

    // Hoán đổi dữ liệu camera giữa Team A và Team B theo từng lane
    function swapTeamsCameraData() {
        const lanes = ['Top', 'Jung', 'Mid', 'ADC', 'Support'];

        lanes.forEach(lane => {
            // Đảm bảo cấu trúc tồn tại
            if (!STORE.cameraData || !STORE.cameraData.players || !STORE.cameraData.cameras) {
                return;
            }

            // Hoán đổi tên tuyển thủ
            const tmpPlayer = STORE.cameraData.players.A[lane];
            STORE.cameraData.players.A[lane] = STORE.cameraData.players.B[lane];
            STORE.cameraData.players.B[lane] = tmpPlayer;

            // Hoán đổi link camera
            const tmpCam = STORE.cameraData.cameras.A[lane];
            STORE.cameraData.cameras.A[lane] = STORE.cameraData.cameras.B[lane];
            STORE.cameraData.cameras.B[lane] = tmpCam;

            // Cập nhật lại vào input trên UI nếu có
            const nameInputA = document.getElementById(`playerName_A_${lane}`);
            const nameInputB = document.getElementById(`playerName_B_${lane}`);
            const linkInputA = document.getElementById(`cameraLink_A_${lane}`);
            const linkInputB = document.getElementById(`cameraLink_B_${lane}`);

            if (nameInputA) nameInputA.value = STORE.cameraData.players.A[lane] || '';
            if (nameInputB) nameInputB.value = STORE.cameraData.players.B[lane] || '';
            if (linkInputA) linkInputA.value = STORE.cameraData.cameras.A[lane] || '';
            if (linkInputB) linkInputB.value = STORE.cameraData.cameras.B[lane] || '';
        });

        // Lưu lại vào localStorage (không popup alert)
        try {
            localStorage.setItem('camera_data', JSON.stringify(STORE.cameraData));
        } catch (e) {
            console.warn('Không thể lưu camera_data sau khi swap:', e);
        }
    }

    async function startCamera() {
        try {
            // Yêu cầu quyền truy cập camera trước (cần để lấy device labels)
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Tắt ngay stream này để tắt đèn cam
                stream.getTracks().forEach(track => track.stop());
            } catch(e) {
                // Bỏ qua lỗi này, chúng ta sẽ xử lý sau
            }

            // Lấy danh sách tất cả các thiết bị video
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if(videoDevices.length === 0) {
                alert("Không tìm thấy thiết bị camera nào!");
                return;
            }

            // Tìm OBS Virtual Camera (thường có tên chứa "OBS" hoặc "Virtual Camera")
            let obsCamera = videoDevices.find(device => {
                const label = device.label.toLowerCase();
                return label.includes('obs') || 
                       label.includes('virtual camera') ||
                       label.includes('obs-virtual-camera');
            });

            let selectedDeviceId = null;
            
            // Nếu tìm thấy OBS Virtual Camera, ưu tiên dùng
            if(obsCamera) {
                selectedDeviceId = obsCamera.deviceId;
                console.log(`Đã tìm thấy OBS Virtual Camera: ${obsCamera.label}`);
            } else if(videoDevices.length === 1) {
                // Chỉ có 1 camera, dùng luôn
                selectedDeviceId = videoDevices[0].deviceId;
                console.log(`Sử dụng camera duy nhất: ${videoDevices[0].label || 'Camera 1'}`);
            } else {
                // Có nhiều camera nhưng không tìm thấy OBS Virtual Camera
                // Tạo danh sách camera để user chọn
                const cameraOptions = videoDevices.map((device, index) => 
                    `${index + 1}. ${device.label || `Camera ${index + 1}`}`
                ).join('\n');
                
                const message = `Không tìm thấy OBS Virtual Camera!\n\n` +
                              `Danh sách camera có sẵn:\n${cameraOptions}\n\n` +
                              `Vui lòng:\n` +
                              `1. Bật OBS Virtual Camera trong OBS Studio\n` +
                              `2. Hoặc chọn một camera từ danh sách trên (nhập số 1-${videoDevices.length})`;
                
                const choice = prompt(message);
                const cameraIndex = parseInt(choice) - 1;
                
                if(choice === null || choice === '') {
                    // User đã hủy
                    return;
                }
                
                if(cameraIndex >= 0 && cameraIndex < videoDevices.length) {
                    selectedDeviceId = videoDevices[cameraIndex].deviceId;
                } else {
                    alert("Lựa chọn không hợp lệ! Vui lòng nhập số từ 1 đến " + videoDevices.length);
                    return;
                }
            }

            // Lấy stream từ camera đã chọn
            const constraints = {
                video: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const video = document.getElementById('obsCamPreview');
            
            // Dừng stream cũ nếu có
            if(video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            
            if(video) {
                video.srcObject = stream;
                const deviceName = selectedDeviceId ? 
                    videoDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'Unknown' : 
                    'Default';
                console.log(`Đã bật camera: ${deviceName}`);
                
                // Cập nhật text nút thành "Đang phát"
                const btn = document.getElementById('obsCameraBtn');
                if(btn) {
                    btn.innerHTML = '<i class="fas fa-video"></i> Đang phát';
                    btn.disabled = true;
                    
                    // Khi stream kết thúc, reset button
                    stream.getVideoTracks()[0].onended = () => {
                        btn.innerHTML = 'Bật Cam';
                        btn.disabled = false;
                    };
                }
            }
        } catch(e) {
            console.error('Lỗi bật camera:', e);
            
            let errorMessage = '';
            if(e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                errorMessage = "Không có quyền truy cập camera!\n\nVui lòng:\n1. Cho phép truy cập camera trong trình duyệt\n2. Reload trang và thử lại";
            } else if(e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
                errorMessage = "Không tìm thấy camera!\n\nHãy đảm bảo:\n- Camera được kết nối\n- OBS Virtual Camera đã được bật trong OBS Studio\n- Trình duyệt có quyền truy cập camera";
            } else if(e.name === 'NotReadableError' || e.name === 'TrackStartError') {
                errorMessage = `Camera đang được sử dụng bởi ứng dụng khác!\n\nVui lòng:\n- Đóng các ứng dụng đang sử dụng camera\n- Thử lại sau`;
            } else {
                errorMessage = `Lỗi bật camera: ${e.message}\n\nHãy đảm bảo:\n- Camera được kết nối\n- OBS Virtual Camera đã được bật trong OBS Studio (nếu cần)\n- Trình duyệt có quyền truy cập camera`;
            }
            
            alert(errorMessage);
        }
    }

    // --- NOTIFICATION SYSTEM ---
    function showNotification(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `obs-toast obs-toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        // Add styles if not exists
        if (!document.getElementById('obs-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'obs-toast-styles';
            style.textContent = `
                .obs-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    z-index: 10000;
                    animation: slideInRight 0.3s ease-out;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    max-width: 400px;
                    word-wrap: break-word;
                }
                .obs-toast i {
                    font-size: 16px;
                    flex-shrink: 0;
                }
                .obs-toast-success { background: linear-gradient(135deg, #10b981, #059669); }
                .obs-toast-error { background: linear-gradient(135deg, #ef4444, #dc2626); }
                .obs-toast-info { background: linear-gradient(135deg, #3b82f6, #2563eb); }
                .obs-toast-warning { background: linear-gradient(135deg, #f59e0b, #d97706); }
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-times-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-info-circle';
        }
    }

    // --- ENDGAME BACKGROUND SWAP ---
    const ENDGAME_BG_PATHS = {
        path1: 'E:/MCuongCup/Live Final/End Game.png',
        path2: 'E:/MCuongCup/Live Final/End Game 2.png'
    };
    
    async function swapEndgameBackground() {
        try {
            // Get current state from localStorage (default to path1)
            let currentBg = localStorage.getItem('endgame_bg_state') || 'path1';
            
            // Toggle to the other background
            const newBg = currentBg === 'path1' ? 'path2' : 'path1';
            const newPath = ENDGAME_BG_PATHS[newBg];
            
            // Update OBS source
            await obs.call('SetInputSettings', {
                inputName: 'background-endgame',
                inputSettings: {
                    local_file: newPath,
                    file: newPath
                }
            });
            
            // Save new state
            localStorage.setItem('endgame_bg_state', newBg);
            
            // Update button text
            const fileName = newBg === 'path1' ? 'End Game.png' : 'End Game 2.png';
            const btnText = document.getElementById('obs-endgame-bg-text');
            if(btnText) {
                btnText.textContent = `Đang dùng: ${fileName}`;
            }
            
            console.log(`Đã đổi background endgame sang: ${fileName}`);
        } catch(e) {
            console.error('Lỗi đổi background endgame:', e);
            alert(`Lỗi đổi background: ${e.message}\n\nHãy đảm bảo:\n- Đã kết nối OBS\n- Scene "Endgame" có source tên "background-endgame"`);
        }
    }
    
    function loadEndgameBackgroundState() {
        const currentBg = localStorage.getItem('endgame_bg_state') || 'path1';
        const fileName = currentBg === 'path1' ? 'End Game.png' : 'End Game 2.png';
        const btnText = document.getElementById('obs-endgame-bg-text');
        if(btnText) {
            btnText.textContent = `Đang dùng: ${fileName}`;
        }
    }

    // --- IMAGE SELECTION FOR CAMERA ---
    function selectImageForCamera(team, lane) {
        // Create hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
        input.style.display = 'none';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                // Try to get full path (works in Electron/file:// contexts)
                let filePath = file.path || '';
                
                // Convert to file:// protocol if we have the path
                if (filePath && !filePath.startsWith('file://') && !filePath.startsWith('http')) {
                    // Handle Windows paths (C:\... -> file:///C:/...)
                    filePath = filePath.replace(/\\/g, '/');
                    if (filePath.match(/^[a-zA-Z]:/)) {
                        filePath = 'file:///' + filePath;
                    } else {
                        filePath = 'file://' + filePath;
                    }
                    
                    updateCameraLinkField(team, lane, filePath);
                    showNotification(`✅ Đã chọn hình: ${file.name}`, 'success');
                } else if (!filePath) {
                    // In browser context, compress and convert to Data URL
                    const fileSizeMB = file.size / (1024 * 1024);
                    
                    // Show loading notification
                    if (fileSizeMB > 5) {
                        showNotification(`⏳ Đang nén ảnh ${fileSizeMB.toFixed(1)}MB...`, 'info');
                    } else {
                        showNotification(`⏳ Đang tải ảnh...`, 'info');
                    }
                    
                    try {
                        // Compress image before saving
                        const compressedDataUrl = await compressImage(file, 1920, 1080, 0.85);
                        updateCameraLinkField(team, lane, compressedDataUrl);
                        
                        // Calculate compressed size
                        const compressedSizeMB = (compressedDataUrl.length * 0.75) / (1024 * 1024); // rough estimate
                        
                        if (fileSizeMB > 5) {
                            showNotification(`✅ Đã nén ${fileSizeMB.toFixed(1)}MB → ${compressedSizeMB.toFixed(1)}MB`, 'success');
                        } else {
                            showNotification(`✅ Đã tải hình: ${file.name}`, 'success');
                        }
                    } catch (error) {
                        console.error('Error compressing image:', error);
                        showNotification('❌ Lỗi xử lý hình ảnh!', 'error');
                    }
                } else {
                    updateCameraLinkField(team, lane, filePath);
                    showNotification(`✅ Đã chọn hình: ${file.name}`, 'success');
                }
            }
            
            // Remove input element
            document.body.removeChild(input);
        };
        
        input.oncancel = () => {
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    }
    
    // Compress image to reduce file size
    function compressImage(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth || height > maxHeight) {
                        const aspectRatio = width / height;
                        
                        if (width > height) {
                            width = maxWidth;
                            height = width / aspectRatio;
                        } else {
                            height = maxHeight;
                            width = height * aspectRatio;
                        }
                    }
                    
                    // Create canvas and draw resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to Data URL with compression
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    function updateCameraLinkField(team, lane, path) {
        const linkInput = document.getElementById(`cameraLink_${team}_${lane}`);
        if (linkInput) {
            linkInput.value = path;
            
            // Save to STORE
            if (!STORE.cameraData.cameras[team]) {
                STORE.cameraData.cameras[team] = {};
            }
            STORE.cameraData.cameras[team][lane] = path;
            
            // Save to localStorage
            localStorage.setItem('camera_data', JSON.stringify(STORE.cameraData));
            
            // Visual feedback
            linkInput.style.borderColor = '#10b981';
            setTimeout(() => {
                linkInput.style.borderColor = '#444';
            }, 1500);
        }
        
        console.log(`Đã chọn hình cho ${team} - ${lane}: ${path.substring(0, 100)}${path.length > 100 ? '...' : ''}`);
    }
    
    // Detect if a link is an image (local file or URL)
    function isImageLink(link) {
        if (!link || link.trim() === '') return false;
        
        const lowerLink = link.toLowerCase();
        
        // Check if it's a Data URL (data:image/...)
        if (lowerLink.startsWith('data:image/')) return true;
        
        // Check if starts with file://
        if (lowerLink.startsWith('file://')) return true;
        
        // Check if ends with image extensions
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        if (imageExtensions.some(ext => lowerLink.endsWith(ext))) return true;
        
        // Check if it's a Cloudinary image URL
        if (lowerLink.includes('cloudinary.com') && lowerLink.includes('/image/')) return true;
        
        // Check for common image hosting patterns
        if (lowerLink.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i)) return true;
        
        return false;
    }
    
    // --- AUTO-ROTATION LOGIC ---
    function toggleAutoRotation() {
        rotationState.enabled = !rotationState.enabled;
        
        if (rotationState.enabled) {
            // Start rotation
            startRotationInterval();
            updateAutoRotationUI();
            
            // Immediately select the current lane
            const currentLane = rotationState.lanes[rotationState.currentLaneIndex];
            selectLane(currentLane);
            
            // Save state to localStorage
            localStorage.setItem('camera_auto_rotation', 'true');
            
            console.log('Auto-rotation started');
        } else {
            // Stop rotation
            stopRotationInterval();
            updateAutoRotationUI();
            
            // Save state to localStorage
            localStorage.setItem('camera_auto_rotation', 'false');
            
            console.log('Auto-rotation stopped');
        }
    }
    
    function startRotationInterval() {
        // Clear any existing interval
        if (rotationInterval) {
            clearInterval(rotationInterval);
        }
        
        // Reset time remaining
        rotationState.timeRemaining = 15;
        
        // Set 1 second interval
        rotationInterval = setInterval(() => {
            rotationState.timeRemaining--;
            
            // Update UI
            updateAutoRotationUI();
            
            // When time reaches 0, switch to next lane
            if (rotationState.timeRemaining <= 0) {
                // Move to next lane
                rotationState.currentLaneIndex = (rotationState.currentLaneIndex + 1) % rotationState.lanes.length;
                const nextLane = rotationState.lanes[rotationState.currentLaneIndex];
                
                // Select the lane (this will broadcast to both teams)
                selectLane(nextLane);
                
                // Reset timer
                rotationState.timeRemaining = 15;
                
                console.log(`Auto-rotated to: ${nextLane}`);
            }
        }, 1000);
    }
    
    function stopRotationInterval() {
        if (rotationInterval) {
            clearInterval(rotationInterval);
            rotationInterval = null;
        }
        rotationState.timeRemaining = 15;
    }
    
    function updateAutoRotationUI() {
        const toggleBtn = document.getElementById('autoRotationToggle');
        const statusEl = document.getElementById('autoRotationStatus');
        const textEl = document.getElementById('autoRotationText');
        
        if (rotationState.enabled) {
            if (toggleBtn) {
                toggleBtn.style.background = 'var(--success)';
            }
            if (textEl) {
                textEl.textContent = 'Tắt Auto';
            }
            if (statusEl) {
                const currentLane = rotationState.lanes[rotationState.currentLaneIndex];
                const laneNames = {
                    'Top': 'TOP',
                    'Jung': 'RỪNG',
                    'Mid': 'GIỮA',
                    'ADC': 'XẠ THỦ',
                    'Support': 'HỖ TRỢ'
                };
                statusEl.innerHTML = `<span style="color: var(--success); font-weight: 600;">${laneNames[currentLane] || currentLane}</span> - ${rotationState.timeRemaining}s`;
            }
        } else {
            if (toggleBtn) {
                toggleBtn.style.background = '#333';
            }
            if (textEl) {
                textEl.textContent = 'Bật Auto';
            }
            if (statusEl) {
                statusEl.textContent = 'Chưa bật';
                statusEl.style.color = '#888';
            }
        }
    }
    
    function loadAutoRotationState() {
        const savedState = localStorage.getItem('camera_auto_rotation');
        if (savedState === 'true') {
            // Don't auto-start on load, just restore the toggle state
            // User needs to manually enable it
            rotationState.enabled = false;
        }
        updateAutoRotationUI();
    }

    // --- HIGHLIGHT FILE/FOLDER SELECTION ---
    function handleFolderSelect(event) {
        const files = event.target.files;
        if(files && files.length > 0) {
            // Get the path from the first file
            const firstFile = files[0];
            // Extract folder path (remove filename)
            let folderPath = firstFile.path || firstFile.webkitRelativePath || '';
            
            // In browsers, we can't get the full path directly
            // So we'll use webkitRelativePath and extract the folder
            if(folderPath) {
                const parts = folderPath.split('/');
                if(parts.length > 1) {
                    parts.pop(); // Remove filename
                    folderPath = parts.join('/');
                }
                
                const folderInput = document.getElementById('obs-highlight-folder');
                if(folderInput) {
                    folderInput.value = folderPath;
                    localStorage.setItem('obs_highlight_folder', folderPath);
                }
            }
        }
    }
    
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if(file) {
            // Try to get full path (only works in some environments like Electron)
            let filePath = file.path || file.webkitRelativePath || file.name;
            
            const pathInput = document.getElementById('obs-highlight-path');
            if(pathInput) {
                pathInput.value = filePath;
            }
        }
    }

    // Expose API
    return {
        loadStore,
        connectOBS,
        scanSources,
        togglePin,
        setLink,
        removeSourceFromGroup,
        openSourcePickerForGroup,
        closeSourcePicker,
        updateSourceContent,
        updateSourceFromSetupField,
        updateHighlight,
        reloadBrowser,
        toggleSourceVisiblityLinked,
        toggleVis,
        saveReplayBuffer,
        startCamera,
        stopCamera,
        switchOBSView,
        renderDashboard,
        // Camera management functions
        loadPlayerNamesFromPicks,
        saveCameraData,
        loadCameraData,
        updatePlayerNameFromInput,
        selectLane,
        swapTeamsCameraData,
        selectImageForCamera,
        toggleAutoRotation,
        loadAutoRotationState,
        // Endgame background swap
        swapEndgameBackground,
        loadEndgameBackgroundState,
        // Highlight file/folder selection
        handleFolderSelect,
        handleFileSelect,
        // Swap pairs functions
        openSwapPairDialog,
        closeSwapPairDialog,
        saveSwapPair,
        removeSwapPair,
        executeSwapPairs
    };
})();

// Expose to window for inline handlers
window.obsManagerAPI = obsManager;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load endgame background state
    obsManager.loadEndgameBackgroundState();
    
    // Load auto-rotation state
    obsManager.loadAutoRotationState();
    
    // Load highlight source name from localStorage
    const savedSourceName = localStorage.getItem('obs_highlight_source_name');
    const sourceNameInput = document.getElementById('obs-highlight-source-name');
    if(sourceNameInput && savedSourceName) {
        sourceNameInput.value = savedSourceName;
    }
    
    // Save highlight source name when it changes
    if(sourceNameInput) {
        sourceNameInput.addEventListener('change', (e) => {
            localStorage.setItem('obs_highlight_source_name', e.target.value);
        });
    }
    
    // Load highlight folder from localStorage
    const savedFolder = localStorage.getItem('obs_highlight_folder');
    const folderInput = document.getElementById('obs-highlight-folder');
    if(folderInput && savedFolder) {
        folderInput.value = savedFolder;
    }
    
    // Save highlight folder when it changes
    if(folderInput) {
        folderInput.addEventListener('change', (e) => {
            localStorage.setItem('obs_highlight_folder', e.target.value);
        });
    }

    // Quick objective buttons (reuse Ban/Pick websocket events)
    const quickObjectiveButtons = document.querySelectorAll('.quick-obj-btn');
    quickObjectiveButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const team = btn.dataset.team;
            const objective = btn.dataset.obj;
            const bpSocket = window.banpickSocket;
            let sent = false;
            if (typeof window.sendObjectiveFromBanpick === 'function') {
                sent = window.sendObjectiveFromBanpick(team, objective, 'start');
            } else if (bpSocket && bpSocket.readyState === WebSocket.OPEN) {
                bpSocket.send(JSON.stringify({ type: 'objective', team, objective, action: 'start' }));
                sent = true;
            }
            if (!sent) {
                alert('WebSocket chưa kết nối (tab Ban-Pick). Vui lòng mở lại trang hoặc kiểm tra server.');
            }
        });
    });

    // Quick match buttons
    const quickNextMatch = document.getElementById('quick-next-match');
    if (quickNextMatch && typeof window.handleNextMatch === 'function') {
        quickNextMatch.addEventListener('click', () => {
            window.handleNextMatch();
        });
    }

    const quickSwapTeam = document.getElementById('quick-swap-team');
    if (quickSwapTeam && typeof window.handleSwapTeamInfo === 'function') {
        quickSwapTeam.addEventListener('click', () => {
            window.handleSwapTeamInfo();
        });
    }
});

