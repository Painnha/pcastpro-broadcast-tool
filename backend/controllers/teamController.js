const path = require('path');
const fs = require('fs');
const { projectRoot } = require('../config/pathHelper');

// API: Get team information from text files
const getTeamInfo = async (req, res) => {
    try {
        const obsDataPath = path.join(projectRoot, 'obs-data');
        
        let teamAName = 'team xanh';
        let teamBName = 'team đỏ';
        let scoreA = '0';
        let scoreB = '0';
        
        // Read files if they exist
        try {
            const nameAPath = path.join(obsDataPath, 'nameA.txt');
            const nameBPath = path.join(obsDataPath, 'nameB.txt');
            const scoreAPath = path.join(obsDataPath, 'scoreA.txt');
            const scoreBPath = path.join(obsDataPath, 'scoreB.txt');
            
            if (fs.existsSync(nameAPath)) {
                teamAName = fs.readFileSync(nameAPath, 'utf8').trim();
            }
            if (fs.existsSync(nameBPath)) {
                teamBName = fs.readFileSync(nameBPath, 'utf8').trim();
            }
            if (fs.existsSync(scoreAPath)) {
                scoreA = fs.readFileSync(scoreAPath, 'utf8').trim();
            }
            if (fs.existsSync(scoreBPath)) {
                scoreB = fs.readFileSync(scoreBPath, 'utf8').trim();
            }
        } catch (error) {
            // Some text files not found, using defaults
        }
        
        const result = {
            teamAName,
            teamBName,
            scoreA: parseInt(scoreA) || 0,
            scoreB: parseInt(scoreB) || 0
        };
        
        res.status(200).send(result);
    } catch (error) {
        console.error('Error reading team info:', error);
        res.status(500).send({ message: 'Lỗi khi đọc thông tin đội' });
    }
};

// API: Save team information to text files
const saveTeamInfo = async (req, res) => {
    const { teamAName, teamBName, scoreA, scoreB } = req.body;
    
    if (!teamAName || !teamBName) {
        return res.status(400).send({ message: 'Thiếu tên đội' });
    }
    
    if (scoreA < 0 || scoreB < 0 || scoreA > 99 || scoreB > 99) {
        return res.status(400).send({ message: 'Điểm số phải từ 0 đến 99' });
    }
    
    try {
        // Create obs-data directory if it doesn't exist (at root level)
        const obsDataPath = path.join(projectRoot, 'obs-data');
        if (!fs.existsSync(obsDataPath)) {
            fs.mkdirSync(obsDataPath, { recursive: true });
        }
        
        // Write to separate text files
        fs.writeFileSync(path.join(obsDataPath, 'nameA.txt'), teamAName, 'utf8');
        fs.writeFileSync(path.join(obsDataPath, 'nameB.txt'), teamBName, 'utf8');
        fs.writeFileSync(path.join(obsDataPath, 'scoreA.txt'), scoreA.toString(), 'utf8');
        fs.writeFileSync(path.join(obsDataPath, 'scoreB.txt'), scoreB.toString(), 'utf8');
        
        res.status(200).send({ 
            message: 'Thông tin đội đã được lưu thành công!',
            files: ['nameA.txt', 'nameB.txt', 'scoreA.txt', 'scoreB.txt']
        });
    } catch (error) {
        console.error('Error saving team info:', error);
        res.status(500).send({ message: 'Lỗi khi lưu thông tin đội' });
    }
};

module.exports = {
    getTeamInfo,
    saveTeamInfo
};
