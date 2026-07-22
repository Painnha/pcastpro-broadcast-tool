/**
 * @file index.js
 * @description Controls the main admin view layout, handles user session verification, theme switches, and binds WebSocket updates.
 */

/**
 * Initializes WebSocket connection and registers message handlers.
 */
const initializeWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socketService.connect(`${protocol}//${window.location.host}/ws`);

    // Handle session force-logout signal from backend
    socketService.on('force_logout', (data) => {
        handleForceLogout(data.message, data.reason);
    });

    // Handle Delta Updater & Self-Healing progress notifications
    socketService.on('update-progress', (data) => {
        handleUpdateProgress(data);
    });

    // Forward TikTok and Facebook Live comments or status events to fandomWar
    socketService.on('message', (message) => {
        if (message.type === 'update-progress') {
            handleUpdateProgress(message);
        }
        if (message.type && (message.type.startsWith('tiktok-') || message.type.startsWith('facebook-'))) {
            if (window.fandomWar) {
                window.fandomWar.handleWebSocketMessage(message);
            }
        }
    });
};

/**
 * Render real-time progress toast for Delta Updater & Asset Self-Healing
 */
const handleUpdateProgress = (data) => {
    let toast = document.getElementById('update-progress-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'update-progress-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            width: 360px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(59, 130, 246, 0.4);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            border-radius: 12px;
            padding: 16px;
            color: #f8fafc;
            font-family: 'Inter', sans-serif;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(toast);
    }

    if (data.status === 'error' || data.status === 'core-update-available') {
        toast.style.display = 'block';
        toast.style.borderColor = data.status === 'error' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)';
        const iconColor = data.status === 'error' ? '#f87171' : '#fbbf24';
        const titleText = data.status === 'error' ? 'Thông báo cập nhật' : 'Có bản nâng cấp Core mới';
        toast.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <i class="fas fa-exclamation-triangle" style="color:${iconColor}; font-size:20px;"></i>
                <div>
                    <strong style="font-size:14px; color:${iconColor};">${titleText}</strong>
                    <div style="font-size:12px; color:#cbd5e1; margin-top:2px;">${data.message}</div>
                </div>
            </div>
        `;
        setTimeout(() => {
            if (toast) toast.style.display = 'none';
        }, 6000);
    }
};

/**
 * Perform a force logout in response to a server signal or session expiration.
 * @param {string} message - Description message shown to user
 * @param {'force_logout'|'session_expired'|'account_banned'} reason - Categorized logout cause
 */
const handleForceLogout = (message, reason) => {
    let alertMessage = message;
    
    switch(reason) {
        case 'force_logout':
            alertMessage += '\n\nBạn sẽ được chuyển hướng để đăng nhập lại.';
            break;
        case 'session_expired':
            alertMessage = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
            break;
        case 'account_banned':
            alertMessage = 'Tài khoản của bạn đã bị khóa. Liên hệ quản trị viên.';
            break;
        default:
            alertMessage = 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
    }
    
    alert(alertMessage);
    
    // Clear storage and redirect
    API.logout();
};

/**
 * Authenticates user session against the server database.
 * @returns {Promise<boolean>} True if session is valid, false otherwise
 */
const checkUserSession = async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        alert('Bạn chưa đăng nhập. Bạn sẽ được chuyển hướng đến trang đăng nhập.');
        window.location.href = '/login.html';
        return false;
    }

    try {
        const data = await API.get('/check-session');
        
        if (data.user) {
            updateUserInfo(data.user);
            applyPermissions(data.user.permissions || [], data.user.role);
            
            // Auto load OBS store if user has permission
            const hasObs = data.user.role === 'admin' || (data.user.permissions && data.user.permissions.includes('quanlyobs'));
            if (hasObs && window.obsManagerAPI && typeof window.obsManagerAPI.loadStore === 'function') {
                window.obsManagerAPI.loadStore();
            }
        }
        return true;
    } catch (error) {
        console.error('Error checking session:', error);
        alert(error.message || 'Đã có lỗi xảy ra khi kiểm tra phiên đăng nhập.');
        API.logout();
        return false;
    }
};

/**
 * Applies permission restrictions to the UI elements.
 * @param {string[]} permissions - List of permission keys owned by the user
 * @param {'user'|'admin'} role - User role
 */
const applyPermissions = (permissions, role) => {
    const hasBasic = role === 'admin' || permissions.includes('basic');
    const hasFandom = role === 'admin' || permissions.includes('fandomwar');
    const hasObs = role === 'admin' || permissions.includes('quanlyobs');

    const tabBanpick = document.querySelector('.main-tab[data-tab="banpick"]');
    const tabObs = document.querySelector('.main-tab[data-tab="obs-manager"]');
    
    const banpickTabContent = document.getElementById('banpick-tab');
    const obsManagerTabContent = document.getElementById('obs-manager-tab');
    const noPermissionMessage = document.getElementById('no-permission-message');
    const mainTabsContainer = document.querySelector('.main-tabs');

    // Reset default styling
    if (noPermissionMessage) noPermissionMessage.style.display = 'none';

    // Check if the user has no permissions at all
    if (!hasBasic && !hasFandom && !hasObs) {
        if (mainTabsContainer) mainTabsContainer.style.display = 'none';
        if (banpickTabContent) banpickTabContent.classList.remove('active');
        if (obsManagerTabContent) obsManagerTabContent.classList.remove('active');
        if (tabBanpick) tabBanpick.classList.remove('active');
        if (tabObs) tabObs.classList.remove('active');
        if (noPermissionMessage) noPermissionMessage.style.display = 'block';
        return;
    }

    if (mainTabsContainer) mainTabsContainer.style.display = 'flex';

    // Show/hide tab headers
    if (tabBanpick) {
        tabBanpick.style.display = (hasBasic || hasFandom) ? 'inline-block' : 'none';
    }
    if (tabObs) {
        tabObs.style.display = hasObs ? 'inline-block' : 'none';
    }

    // Toggle sub-components of Ban-Pick tab
    const banpickLeft = document.querySelector('.banpick-left');
    const banpickRight = document.querySelector('.banpick-right');
    const bottomSection = document.querySelector('.bottom-section');

    if (banpickLeft) {
        banpickLeft.style.display = hasBasic ? 'block' : 'none';
    }
    if (banpickRight) {
        banpickRight.style.display = hasFandom ? 'block' : 'none';
        if (hasFandom && !hasBasic) {
            // Fandom war only: let it span full width
            banpickRight.style.flex = '1 1 100%';
        } else {
            // Default split width (30%)
            banpickRight.style.flex = '0 0 30%';
        }
    }
    if (bottomSection) {
        bottomSection.style.display = hasBasic ? 'flex' : 'none';
    }

    // Auto-active the appropriate tab
    // Remove active state from both
    if (tabBanpick) tabBanpick.classList.remove('active');
    if (tabObs) tabObs.classList.remove('active');
    if (banpickTabContent) banpickTabContent.classList.remove('active');
    if (obsManagerTabContent) obsManagerTabContent.classList.remove('active');

    if (hasBasic || hasFandom) {
        if (tabBanpick) tabBanpick.classList.add('active');
        if (banpickTabContent) banpickTabContent.classList.add('active');
    } else if (hasObs) {
        if (tabObs) tabObs.classList.add('active');
        if (obsManagerTabContent) obsManagerTabContent.classList.add('active');
    }
};

/**
 * Update current user metadata display inside UI.
 * @param {Object} user - Authenticated user details
 * @param {string} user.email - User email
 * @param {string} [user.displayName] - Optional visual user label
 * @param {'user'|'admin'} user.role - User role level
 */
const updateUserInfo = (user) => {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.textContent = `Xin chào, ${user.displayName || user.email}${user.role === 'admin' ? ' (Admin)' : ''}`;
    }
    
    loadUserThemes(user);
};

/**
 * Loads owned themes from user data object into the select dropdown list.
 * @param {Object} user - Current user object
 * @param {string[]} user.ownedThemes - List of owned theme keys
 * @param {string} [user.currentTheme] - Active theme ID
 */
const loadUserThemes = (user) => {
    const themeSelect = document.getElementById('themeSelect');
    if (!themeSelect || !user) return;
    
    if (!user.ownedThemes || user.ownedThemes.length === 0) {
        themeSelect.style.display = 'none';
        
        let noThemesMsg = document.getElementById('noThemesMessage');
        if (!noThemesMsg) {
            noThemesMsg = document.createElement('span');
            noThemesMsg.id = 'noThemesMessage';
            noThemesMsg.className = 'no-themes-message';
            themeSelect.parentNode.appendChild(noThemesMsg);
        }
        noThemesMsg.textContent = 'chưa sở hữu theme nào';
        noThemesMsg.style.display = 'inline';
        return;
    }
    
    themeSelect.style.display = 'inline-block';
    const noThemesMsg = document.getElementById('noThemesMessage');
    if (noThemesMsg) {
        noThemesMsg.style.display = 'none';
    }
    
    themeSelect.innerHTML = '';
    
    user.ownedThemes.forEach(themeId => {
        const option = document.createElement('option');
        option.value = themeId;
        option.textContent = themeId.charAt(0).toUpperCase() + themeId.slice(1);
        themeSelect.appendChild(option);
    });
    
    if (user.currentTheme) {
        themeSelect.value = user.currentTheme;
    }
};

/**
 * Triggers database update when user changes their active theme.
 * @param {string} newThemeId - Target theme ID
 */
const handleThemeChange = async (newThemeId) => {
    try {
        await API.put('/user/update-theme', { currentTheme: newThemeId });
        alert('Theme đã được cập nhật thành công!');
    } catch (error) {
        console.error('Error updating theme:', error);
        alert(error.message || 'Đã có lỗi xảy ra khi cập nhật theme.');
    }
};

/**
 * Visual logout prompt to clear session cookies/caches.
 */
const triggerLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        API.logout();
    }
};

/**
 * Global toast notification function.
 * @param {string} message - Message text
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - Notification type
 */
window.showToast = (message, type = 'info') => {
    let toastContainer = document.getElementById('global-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'global-toast-container';
        toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
        document.body.appendChild(toastContainer);

        if (!document.getElementById('global-toast-keyframes')) {
            const style = document.createElement('style');
            style.id = 'global-toast-keyframes';
            style.textContent = `
                @keyframes toastSlideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes toastSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(120%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    const toast = document.createElement('div');
    let bgColor = '#3b82f6';
    let iconClass = 'fa-info-circle';

    if (type === 'success') {
        bgColor = 'linear-gradient(135deg, #10b981, #059669)';
        iconClass = 'fa-check-circle';
    } else if (type === 'error' || type === 'danger') {
        bgColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
        iconClass = 'fa-exclamation-circle';
    } else if (type === 'warning') {
        bgColor = 'linear-gradient(135deg, #f59e0b, #d97706)';
        iconClass = 'fa-exclamation-triangle';
    }

    toast.style.cssText = `background: ${bgColor}; color: #fff; padding: 12px 18px; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 10px; pointer-events: auto; animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.15);`;
    toast.innerHTML = `<i class="fas ${iconClass}" style="font-size: 16px;"></i> <span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

/**
 * Updates Motion Hero toggle button UI.
 * @param {boolean} enabled - Whether motion hero is ON or OFF
 */
const updateMotionHeroUI = (enabled) => {
    const btn = document.getElementById('motionHeroToggleBtn');
    const textSpan = document.getElementById('motionHeroBtnText');
    if (!btn || !textSpan) return;

    if (enabled) {
        btn.className = 'btn btn-purple';
        textSpan.textContent = 'Ảnh tướng động: ON';
        btn.setAttribute('title', 'Ảnh tướng động đang BẬT. Click để tắt.');
    } else {
        btn.className = 'btn btn-gray';
        textSpan.textContent = 'Ảnh tướng động: OFF';
        btn.setAttribute('title', 'Ảnh tướng động đang TẮT. Click để bật.');
    }
};

/**
 * Fetches current Motion Hero status for active user.
 */
const checkMotionHeroStatus = async () => {
    try {
        const data = await API.get('/api/motion-hero/check');
        const btn = document.getElementById('motionHeroToggleBtn');
        if (data.success) {
            if (data.hasMotionHero) {
                if (btn) btn.style.display = 'inline-block';
                updateMotionHeroUI(data.motionHeroEnabled);
            } else {
                if (btn) btn.style.display = 'none';
                updateMotionHeroUI(false);
            }
        }
    } catch (e) {
        const btn = document.getElementById('motionHeroToggleBtn');
        if (btn) btn.style.display = 'none';
        updateMotionHeroUI(false);
    }
};

// Application Main Entrypoint IIFE
(async () => {
    const isValidSession = await checkUserSession();
    if (!isValidSession) return;

    // Connect to WebSocket using shared socketService
    initializeWebSocket();
    
    // Bind UI actions
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', triggerLogout);
    }
    
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            handleThemeChange(e.target.value);
        });
    }
    
    const guideButton = document.getElementById('guideButton');
    if (guideButton) {
        guideButton.addEventListener('click', () => {
            window.open('guide.html', '_blank');
        });
    }

    const motionHeroBtn = document.getElementById('motionHeroToggleBtn');
    if (motionHeroBtn) {
        // Fetch current setting state
        checkMotionHeroStatus();

        motionHeroBtn.addEventListener('click', async () => {
            try {
                const data = await API.post('/api/motion-hero/toggle', {});
                if (data.success) {
                    updateMotionHeroUI(data.motionHeroEnabled);
                    window.showToast(data.message, 'success');
                }
            } catch (error) {
                console.error('Error toggling motion hero:', error);
                window.showToast(error.message || 'Bạn chưa có quyền sử dụng tính năng này!', 'error');
            }
        });
    }
})();
