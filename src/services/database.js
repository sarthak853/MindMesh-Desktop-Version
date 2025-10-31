const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        // Store database in user data directory
        const userDataPath = app.getPath('userData');
        this.dbPath = path.join(userDataPath, 'mindmesh.db');
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database at:', this.dbPath);
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                content TEXT,
                file_path TEXT,
                keywords TEXT,
                hierarchy TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT,
                transcript TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS concepts (
                id TEXT PRIMARY KEY,
                content_id TEXT NOT NULL,
                content_type TEXT NOT NULL,
                title TEXT,
                description TEXT,
                keywords TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS flashcards (
                id TEXT PRIMARY KEY,
                concept_id TEXT,
                content_id TEXT NOT NULL,
                type TEXT,
                question TEXT,
                answer TEXT,
                difficulty TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS cognitive_maps (
                id TEXT PRIMARY KEY,
                content_id TEXT NOT NULL,
                content_type TEXT NOT NULL,
                nodes TEXT,
                edges TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.runQuery(table);
        }

        console.log('Database tables created successfully');
    }

    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    allQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async storeDocument(filename, content, filePath) {
        const id = this.generateId();
        await this.runQuery(
            'INSERT INTO documents (id, filename, content, file_path) VALUES (?, ?, ?, ?)',
            [id, filename, content, filePath]
        );
        return id;
    }

    async storeVideo(url, title, transcript) {
        const id = this.generateId();
        await this.runQuery(
            'INSERT INTO videos (id, url, title, transcript) VALUES (?, ?, ?, ?)',
            [id, url, title, transcript]
        );
        return id;
    }

    async storeConcepts(contentId, contentType, concepts) {
        // First, delete existing concepts for this content
        await this.runQuery('DELETE FROM concepts WHERE content_id = ?', [contentId]);
        
        // Then insert new concepts with unique IDs
        for (const concept of concepts) {
            const uniqueId = this.generateId(); // Generate new unique ID
            await this.runQuery(
                'INSERT INTO concepts (id, content_id, content_type, title, description, keywords) VALUES (?, ?, ?, ?, ?, ?)',
                [uniqueId, contentId, contentType, concept.title, concept.description, JSON.stringify(concept.keywords)]
            );
        }
    }

    async storeFlashcards(contentId, flashcards) {
        // First, delete existing flashcards for this content
        await this.runQuery('DELETE FROM flashcards WHERE content_id = ?', [contentId]);
        
        // Then insert new flashcards with unique IDs
        for (const card of flashcards) {
            const uniqueId = this.generateId(); // Generate new unique ID
            await this.runQuery(
                'INSERT INTO flashcards (id, concept_id, content_id, type, question, answer, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [uniqueId, card.concept_id, contentId, card.type, card.question, card.answer, card.difficulty]
            );
        }
    }

    async storeCognitiveMap(contentId, contentType, cognitiveMap) {
        // First, delete existing cognitive map for this content
        await this.runQuery('DELETE FROM cognitive_maps WHERE content_id = ?', [contentId]);
        
        // Then insert new cognitive map
        const id = this.generateId();
        await this.runQuery(
            'INSERT INTO cognitive_maps (id, content_id, content_type, nodes, edges) VALUES (?, ?, ?, ?, ?)',
            [id, contentId, contentType, JSON.stringify(cognitiveMap.nodes), JSON.stringify(cognitiveMap.edges)]
        );
    }

    async getAllDocuments() {
        return await this.allQuery('SELECT * FROM documents ORDER BY created_at DESC');
    }

    async getAllVideos() {
        return await this.allQuery('SELECT * FROM videos ORDER BY created_at DESC');
    }

    async getConcepts(contentId) {
        const concepts = await this.allQuery('SELECT * FROM concepts WHERE content_id = ?', [contentId]);
        return concepts.map(concept => ({
            ...concept,
            keywords: JSON.parse(concept.keywords || '[]')
        }));
    }

    async getFlashcards(contentId) {
        return await this.allQuery('SELECT * FROM flashcards WHERE content_id = ?', [contentId]);
    }

    async getCognitiveMap(contentId) {
        const map = await this.getQuery('SELECT * FROM cognitive_maps WHERE content_id = ?', [contentId]);
        if (map) {
            return {
                ...map,
                nodes: JSON.parse(map.nodes || '[]'),
                edges: JSON.parse(map.edges || '[]')
            };
        }
        return null;
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;