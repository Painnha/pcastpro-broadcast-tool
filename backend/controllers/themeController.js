const User = require('../models/User');
const Theme = require('../models/Theme');

// API: Update user theme
const updateTheme = async (req, res) => {
    const { currentTheme } = req.body;
    const { userId } = req.user;
    
    if (!currentTheme) {
        return res.status(400).send({ message: 'Theme ID is required' });
    }
    
    try {
        const user = await User.findById(userId);
        if (!user.ownedThemes || !user.ownedThemes.includes(currentTheme)) {
            return res.status(403).send({ message: 'Bạn không sở hữu theme này' });
        }
        
        await User.findByIdAndUpdate(userId, { currentTheme });
        
        res.send({ message: 'Theme đã được cập nhật thành công' });
    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).send({ message: 'Lỗi khi cập nhật theme' });
    }
};

// API: Get available themes
const getThemes = async (req, res) => {
    try {
        const themes = await Theme.find({}, 'themeID path -_id');
        res.json({ themes });
    } catch (error) {
        console.error('Error fetching themes:', error);
        res.status(500).send({ message: 'Error fetching themes' });
    }
};

// API: Initialize themes
const initThemes = async (req, res) => {
    try {
        const defaultExists = await Theme.findOne({ themeID: 'default' });
        if (!defaultExists) {
            const defaultTheme = new Theme({
                themeID: 'default',
                path: 'themes/default'
            });
            await defaultTheme.save();
        }
        
        const apl2025Exists = await Theme.findOne({ themeID: 'apl2025' });
        if (!apl2025Exists) {
            const apl2025Theme = new Theme({
                themeID: 'apl2025',
                path: 'themes/apl2025'
            });
            await apl2025Theme.save();
        }
        
        const blvChanhDtdv2026Exists = await Theme.findOne({ themeID: 'blvChanh_dtdv2026' });
        if (!blvChanhDtdv2026Exists) {
            const blvChanhDtdv2026Theme = new Theme({
                themeID: 'blvChanh_dtdv2026',
                path: 'themes/blvChanh_dtdv2026'
            });
            await blvChanhDtdv2026Theme.save();
        }
        
        res.send({ message: 'Themes initialized successfully' });
    } catch (error) {
        console.error('Error initializing themes:', error);
        res.status(500).send({ message: 'Error initializing themes' });
    }
};

// API: Assign theme to user (admin only)
const assignTheme = async (req, res) => {
    const { userEmail, themeId } = req.body;
    const { role } = req.user;
    
    // Check if user is admin
    if (role !== 'admin') {
        return res.status(403).send({ message: 'Chỉ admin mới có thể thực hiện thao tác này' });
    }
    
    if (!userEmail || !themeId) {
        return res.status(400).send({ message: 'Email và theme ID là bắt buộc' });
    }
    
    try {
        // Check if theme exists
        const theme = await Theme.findOne({ themeID: themeId });
        if (!theme) {
            return res.status(404).send({ message: 'Theme không tồn tại' });
        }
        
        // Find user
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).send({ message: 'Người dùng không tồn tại' });
        }
        
        // Add theme to user's owned themes if not already owned
        if (!user.ownedThemes.includes(themeId)) {
            user.ownedThemes.push(themeId);
            await user.save();
        }
        
        res.send({ 
            message: `Theme ${themeId} đã được gán cho ${userEmail}`,
            user: {
                email: user.email,
                ownedThemes: user.ownedThemes
            }
        });
    } catch (error) {
        console.error('Error assigning theme:', error);
        res.status(500).send({ message: 'Lỗi khi gán theme' });
    }
};

// API: Migrate existing users to have default themes
const migrateUsers = async (req, res) => {
    try {
        // Update all users who don't have ownedThemes or have empty ownedThemes
        const result = await User.updateMany(
            { 
                $or: [
                    { ownedThemes: { $exists: false } },
                    { ownedThemes: { $size: 0 } },
                    { ownedThemes: null }
                ]
            },
            { 
                $set: { 
                    ownedThemes: ['default'],
                    currentTheme: 'default'
                }
            }
        );
        
        res.send({ 
            message: `Migration completed. Updated ${result.modifiedCount} users with default theme.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error migrating users:', error);
        res.status(500).send({ message: 'Error during migration' });
    }
};

module.exports = {
    updateTheme,
    getThemes,
    initThemes,
    assignTheme,
    migrateUsers
};
