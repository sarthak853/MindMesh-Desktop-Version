const fs = require('fs').promises;
const path = require('path');
const PDFParser = require('pdf2json');
const KeywordExtractor = require('./keywordExtractor');
const FlashcardGenerator = require('./flashcardGenerator');

class DocumentProcessor {
    constructor() {
        this.keywordExtractor = new KeywordExtractor();
        this.flashcardGenerator = new FlashcardGenerator();
    }

    async processFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        let content = '';

        try {
            if (ext === '.txt' || ext === '.md') {
                content = await fs.readFile(filePath, 'utf8');
            } else if (ext === '.pdf') {
                content = await this.processPDF(filePath);
            } else {
                throw new Error(`Unsupported file type: ${ext}`);
            }

            // Extract keywords using advanced algorithm
            const keywords = this.keywordExtractor.extractKeywords(content, 20);
            
            // Build hierarchical structure
            const hierarchy = this.keywordExtractor.buildHierarchy(keywords, content);
            
            // Generate concepts from keywords
            const concepts = this.extractConcepts(content, keywords);
            
            // Generate flashcards using advanced algorithm
            const flashcards = this.flashcardGenerator.generateFlashcards(keywords, content, hierarchy);
            
            // Generate cognitive map from hierarchy
            const cognitiveMap = this.keywordExtractor.hierarchyToGraph(hierarchy);

            return {
                content,
                keywords,
                hierarchy,
                concepts,
                flashcards,
                cognitiveMap
            };
        } catch (error) {
            throw new Error(`Failed to process file: ${error.message}`);
        }
    }

    async processPDF(filePath) {
        return new Promise((resolve, reject) => {
            const pdfParser = new PDFParser();
            
            pdfParser.on('pdfParser_dataError', errData => {
                reject(new Error(`Failed to parse PDF: ${errData.parserError}`));
            });
            
            pdfParser.on('pdfParser_dataReady', pdfData => {
                try {
                    // Extract text from PDF
                    let text = '';
                    
                    if (pdfData.Pages) {
                        pdfData.Pages.forEach(page => {
                            if (page.Texts) {
                                page.Texts.forEach(textItem => {
                                    if (textItem.R) {
                                        textItem.R.forEach(r => {
                                            if (r.T) {
                                                text += decodeURIComponent(r.T) + ' ';
                                            }
                                        });
                                    }
                                });
                                text += '\n';
                            }
                        });
                    }
                    
                    resolve(text.trim());
                } catch (error) {
                    reject(new Error(`Failed to extract text from PDF: ${error.message}`));
                }
            });
            
            pdfParser.loadPDF(filePath);
        });
    }

    extractConcepts(text, keywords) {
        // Enhanced concept extraction using keywords
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const concepts = [];

        // Create concepts from top keywords
        keywords.slice(0, 10).forEach((kw, index) => {
            // Find sentences containing this keyword
            const relatedSentences = sentences.filter(s => 
                s.toLowerCase().includes(kw.word.toLowerCase())
            );

            if (relatedSentences.length > 0) {
                concepts.push({
                    id: `concept_${index}`,
                    title: kw.word,
                    description: relatedSentences[0].trim(),
                    keywords: [kw.word, ...(kw.relatedTerms || [])],
                    category: kw.category,
                    score: kw.score
                });
            }
        });

        return concepts;
    }

    generateCognitiveMap(concepts) {
        const nodes = concepts.map((concept, index) => ({
            id: concept.id,
            label: concept.title,
            title: concept.description,
            x: Math.cos(index * 2 * Math.PI / concepts.length) * 200,
            y: Math.sin(index * 2 * Math.PI / concepts.length) * 200,
            color: this.getNodeColor(index)
        }));

        const edges = [];
        // Create simple connections between adjacent concepts
        for (let i = 0; i < concepts.length - 1; i++) {
            edges.push({
                from: concepts[i].id,
                to: concepts[i + 1].id,
                value: Math.random() * 3 + 1
            });
        }

        return { nodes, edges };
    }

    generateTitle(sentence) {
        const words = sentence.trim().split(' ');
        if (words.length <= 5) {
            return sentence.trim();
        }
        return words.slice(0, 5).join(' ') + '...';
    }

    getNodeColor(index) {
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
        return colors[index % colors.length];
    }
}

module.exports = DocumentProcessor;