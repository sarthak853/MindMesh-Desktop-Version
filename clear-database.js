/**
 * Script to clear the database and start fresh
 * Run this if you're having database constraint issues
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function getDatabasePath() {
    const platform = process.platform;
    const homeDir = os.homedir();
    
    let appDataPath;
    
    if (platform === 'win32') {
        appDataPath = path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'mindmesh-ai-learning-platform');
    } else if (platform === 'darwin') {
        appDataPath = path.join(homeDir, 'Library', 'Application Support', 'mindmesh-ai-learning-platform');
    } else {
        appDataPath = path.join(homeDir, '.config', 'mindmesh-ai-learning-platform');
    }
    
    return path.join(appDataPath, 'mindmesh.db');
}

function clearDatabase() {
    const dbPath = getDatabasePath();
    
    console.log('🗑️  Clearing database...\n');
    console.log('Database path:', dbPath);
    
    if (fs.existsSync(dbPath)) {
        try {
            fs.unlinkSync(dbPath);
            console.log('✅ Database cleared successfully!');
            console.log('\nThe database will be recreated when you start the app.');
        } catch (error) {
            console.error('❌ Error clearing database:', error.message);
            console.log('\nPlease close the app and try again.');
        }
    } else {
        console.log('ℹ️  No database found. Nothing to clear.');
    }
}

clearDatabase();
