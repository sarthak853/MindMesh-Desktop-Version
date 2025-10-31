/**
 * Demo script showing how to use the keyword extraction and hierarchical graph algorithms
 * 
 * Usage:
 * const demo = require('./algorithmDemo');
 * demo.processDocument('path/to/document.pdf');
 */

const DocumentProcessor = require('./documentProcessor');
const KeywordExtractor = require('./keywordExtractor');
const FlashcardGenerator = require('./flashcardGenerator');

class AlgorithmDemo {
    constructor() {
        this.processor = new DocumentProcessor();
        this.keywordExtractor = new KeywordExtractor();
        this.flashcardGenerator = new FlashcardGenerator();
    }

    /**
     * Process a document and generate all outputs
     */
    async processDocument(filePath) {
        console.log('🔍 Processing document:', filePath);
        console.log('─'.repeat(60));

        try {
            // Process the file
            const result = await this.processor.processFile(filePath);

            // Display results
            this.displayKeywords(result.keywords);
            this.displayHierarchy(result.hierarchy);
            this.displayFlashcards(result.flashcards);
            this.displayGraphStats(result.cognitiveMap);

            return result;
        } catch (error) {
            console.error('❌ Error processing document:', error.message);
            throw error;
        }
    }

    /**
     * Display extracted keywords
     */
    displayKeywords(keywords) {
        console.log('\n📌 EXTRACTED KEYWORDS (Top 10):');
        console.log('─'.repeat(60));
        
        keywords.slice(0, 10).forEach((kw, index) => {
            console.log(`${index + 1}. ${kw.word.toUpperCase()}`);
            console.log(`   Score: ${kw.score.toFixed(4)}`);
            console.log(`   Category: ${kw.category}`);
            if (kw.relatedTerms && kw.relatedTerms.length > 0) {
                console.log(`   Related: ${kw.relatedTerms.join(', ')}`);
            }
            console.log();
        });
    }

    /**
     * Display hierarchical structure
     */
    displayHierarchy(hierarchy) {
        console.log('\n🌳 HIERARCHICAL STRUCTURE:');
        console.log('─'.repeat(60));
        
        console.log(`Root: ${hierarchy.root.label}`);
        
        hierarchy.root.children.forEach((category, catIndex) => {
            console.log(`\n  ├─ ${category.label} (${category.children.length} keywords)`);
            
            category.children.slice(0, 3).forEach((keyword, kwIndex) => {
                const prefix = kwIndex === category.children.length - 1 ? '└─' : '├─';
                console.log(`     ${prefix} ${keyword.label} (score: ${keyword.score.toFixed(3)})`);
            });
            
            if (category.children.length > 3) {
                console.log(`     └─ ... and ${category.children.length - 3} more`);
            }
        });
    }

    /**
     * Display generated flashcards
     */
    displayFlashcards(flashcards) {
        console.log('\n🃏 GENERATED FLASHCARDS (Sample):');
        console.log('─'.repeat(60));
        
        const sampleCards = flashcards.slice(0, 5);
        
        sampleCards.forEach((card, index) => {
            console.log(`\nCard ${index + 1} [${card.type.toUpperCase()}] - ${card.difficulty}`);
            console.log(`Q: ${card.question}`);
            console.log(`A: ${card.answer}`);
            if (card.hint) {
                console.log(`Hint: ${card.hint}`);
            }
        });
        
        console.log(`\n📊 Total flashcards generated: ${flashcards.length}`);
    }

    /**
     * Display graph statistics
     */
    displayGraphStats(graph) {
        console.log('\n📊 COGNITIVE MAP STATISTICS:');
        console.log('─'.repeat(60));
        console.log(`Nodes: ${graph.nodes.length}`);
        console.log(`Edges: ${graph.edges.length}`);
        console.log(`Levels: ${Math.max(...graph.nodes.map(n => n.level)) + 1}`);
        
        // Count nodes by level
        const levelCounts = {};
        graph.nodes.forEach(node => {
            levelCounts[node.level] = (levelCounts[node.level] || 0) + 1;
        });
        
        console.log('\nNodes per level:');
        Object.entries(levelCounts).forEach(([level, count]) => {
            const levelName = ['Root', 'Categories', 'Keywords'][level] || `Level ${level}`;
            console.log(`  ${levelName}: ${count}`);
        });
    }

    /**
     * Analyze text directly without file
     */
    analyzeText(text) {
        console.log('🔍 Analyzing text...');
        console.log('─'.repeat(60));

        // Extract keywords
        const keywords = this.keywordExtractor.extractKeywords(text, 15);
        
        // Build hierarchy
        const hierarchy = this.keywordExtractor.buildHierarchy(keywords, text);
        
        // Generate flashcards
        const flashcards = this.flashcardGenerator.generateFlashcards(keywords, text, hierarchy);
        
        // Generate graph
        const graph = this.keywordExtractor.hierarchyToGraph(hierarchy);

        // Display results
        this.displayKeywords(keywords);
        this.displayHierarchy(hierarchy);
        this.displayFlashcards(flashcards);
        this.displayGraphStats(graph);

        return {
            keywords,
            hierarchy,
            flashcards,
            graph
        };
    }

    /**
     * Export results to JSON
     */
    exportResults(result, outputPath) {
        const fs = require('fs').promises;
        
        const exportData = {
            timestamp: new Date().toISOString(),
            keywords: result.keywords,
            hierarchy: result.hierarchy,
            flashcards: result.flashcards,
            graphStats: {
                nodeCount: result.cognitiveMap.nodes.length,
                edgeCount: result.cognitiveMap.edges.length
            }
        };

        return fs.writeFile(
            outputPath,
            JSON.stringify(exportData, null, 2),
            'utf8'
        );
    }
}

// Example usage
if (require.main === module) {
    const demo = new AlgorithmDemo();
    
    // Example text for testing
    const sampleText = `
        Machine learning is a subset of artificial intelligence that focuses on the development 
        of algorithms and statistical models. These algorithms enable computers to improve their 
        performance on tasks through experience. Deep learning is a specialized form of machine 
        learning that uses neural networks with multiple layers.
        
        Neural networks are computing systems inspired by biological neural networks. They consist 
        of interconnected nodes called neurons. Training is the process of teaching a neural network 
        to recognize patterns in data. Supervised learning uses labeled data, while unsupervised 
        learning works with unlabeled data.
        
        Natural language processing (NLP) is another important field in AI. It enables computers 
        to understand, interpret, and generate human language. Applications of NLP include chatbots, 
        translation systems, and sentiment analysis.
    `;
    
    console.log('🚀 Running Algorithm Demo\n');
    demo.analyzeText(sampleText);
}

module.exports = AlgorithmDemo;
