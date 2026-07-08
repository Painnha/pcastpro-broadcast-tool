const path = require('path');
const fs = require('fs');
const express = require('express');
const Theme = require('../models/Theme');
const { projectRoot } = require('../config/pathHelper');

const serveThemeAssets = async (req, res, next) => {
    const { themeFolder } = req.params;
    
    try {
        // First try to find theme by themeID matching the folder name
        let theme = await Theme.findOne({ themeID: themeFolder });
        
        // If not found, try to find theme by path matching the folder
        if (!theme) {
            theme = await Theme.findOne({ 
                $or: [
                    { path: `themes/${themeFolder}` },
                    { path: `/themes/${themeFolder}` }
                ]
            });
        }
        
        if (!theme) {
            return res.status(404).send('Theme not found');
        }
        
        const themePath = path.join(projectRoot, theme.path);
        
        // Handle CSS files with path replacement
        if (req.path.endsWith('.css')) {
            const cssFilePath = path.join(themePath, req.path);
            
            if (fs.existsSync(cssFilePath)) {
                let cssContent = fs.readFileSync(cssFilePath, 'utf8');
                
                // Use the folder name from URL for consistent path replacement
                const themeUrlPath = `/themes/${themeFolder}`;
                
                // Replace relative paths with theme-specific paths
                cssContent = cssContent
                    .replace(/url\(['"]?\/assets\//g, `url('${themeUrlPath}/assets/`)
                    .replace(/url\(['"]?\/font\//g, `url('${themeUrlPath}/assets/font/`)
                    .replace(/url\(['"]?\/images\//g, `url('${themeUrlPath}/assets/`)
                    .replace(/url\(['"]?\/audio\//g, `url('${themeUrlPath}/assets/audio/`);
                
                res.setHeader('Content-Type', 'text/css');
                res.send(cssContent);
                return;
            }
        }
        
        // Default static file serving for other files
        express.static(themePath)(req, res, next);
    } catch (error) {
        console.error('Error serving theme:', error);
        res.status(500).send('Internal server error');
    }
};

module.exports = { serveThemeAssets };
