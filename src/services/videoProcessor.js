const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const DocumentProcessor = require('./documentProcessor');

class VideoProcessor {
    constructor() {
        // Use os.tmpdir() as fallback when app is not available
        let tempPath;
        try {
            const { app } = require('electron');
            tempPath = app.getPath('temp');
        } catch (error) {
            tempPath = os.tmpdir();
        }
        this.tempDir = path.join(tempPath, 'mindmesh');
        this.documentProcessor = new DocumentProcessor();
    }

    async processVideo(url) {
        try {
            // Create temp directory if it doesn't exist
            await fs.mkdir(this.tempDir, { recursive: true });

            // For now, return a mock transcript
            // In a full implementation, you'd use yt-dlp or similar
            const mockTranscript = this.generateMockTranscript(url);
            
            return {
                title: this.extractVideoTitle(url),
                transcript: mockTranscript,
                concepts: this.extractConceptsFromTranscript(mockTranscript),
                flashcards: this.generateFlashcardsFromTranscript(mockTranscript)
            };
        } catch (error) {
            throw new Error(`Failed to process video: ${error.message}`);
        }
    }

    generateMockTranscript(url) {
        // Mock transcript for demonstration
        return `This is a sample transcript for the video at ${url}. 
        The video discusses important concepts about learning and education. 
        Key topics include cognitive mapping, spaced repetition, and active recall. 
        These techniques help improve memory retention and understanding. 
        The video also covers the importance of visual learning aids and interactive content.`;
    }

    extractVideoTitle(url) {
        // Simple title extraction from URL
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'YouTube Video';
        }
        return 'Video Content';
    }

    extractConceptsFromTranscript(transcript) {
        // Reuse document processing logic
        return this.documentProcessor.extractConcepts(transcript);
    }

    generateFlashcardsFromTranscript(transcript) {
        // Reuse document processing logic
        return this.documentProcessor.generateFlashcards(transcript);
    }

    generateCognitiveMap(concepts) {
        return this.documentProcessor.generateCognitiveMap(concepts);
    }
}

module.exports = VideoProcessor;