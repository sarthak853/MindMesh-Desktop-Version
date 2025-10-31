const natural = require('natural');

class KeywordExtractor {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.TfIdf = natural.TfIdf;
        
        // Common stop words to filter out
        this.stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
            'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'what', 'which', 'who', 'when', 'where', 'why', 'how'
        ]);
    }

    /**
     * Extract keywords with TF-IDF scoring (improved to include phrases)
     * @param {string} text - The text to analyze
     * @param {number} topN - Number of top keywords to return
     * @returns {Array} Array of {word, score, category} objects
     */
    extractKeywords(text, topN = 20) {
        const tfidf = new this.TfIdf();
        
        // Split text into paragraphs for better TF-IDF calculation
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
        
        if (paragraphs.length === 0) {
            paragraphs.push(text);
        }
        
        paragraphs.forEach(para => tfidf.addDocument(para));
        
        const keywordScores = new Map();
        
        // Extract meaningful phrases (bigrams and trigrams)
        const phrases = this.extractPhrases(text);
        phrases.forEach(phrase => {
            // Calculate phrase score based on frequency and position
            const frequency = (text.toLowerCase().match(new RegExp(phrase.toLowerCase(), 'g')) || []).length;
            const score = frequency * 2; // Boost phrase scores
            keywordScores.set(phrase, score);
        });
        
        // Calculate TF-IDF scores for single words
        tfidf.listTerms(0).forEach(item => {
            const word = item.term.toLowerCase();
            
            // Filter: length > 3, not a stop word, not a number
            if (word.length > 3 && 
                !this.stopWords.has(word) && 
                !/^\d+$/.test(word)) {
                // Only add if not part of a phrase already
                const isPartOfPhrase = Array.from(keywordScores.keys()).some(phrase => 
                    phrase.includes(word)
                );
                if (!isPartOfPhrase) {
                    keywordScores.set(word, item.tfidf);
                }
            }
        });
        
        // Sort by score and get top N
        const sortedKeywords = Array.from(keywordScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([word, score]) => ({
                word,
                score: parseFloat(score.toFixed(4)),
                category: this.categorizeKeyword(word, text)
            }));
        
        return sortedKeywords;
    }

    /**
     * Extract meaningful phrases (bigrams and trigrams)
     */
    extractPhrases(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const phrases = new Set();
        
        sentences.forEach(sentence => {
            const words = sentence.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 2 && !this.stopWords.has(w));
            
            // Extract bigrams (2-word phrases)
            for (let i = 0; i < words.length - 1; i++) {
                const bigram = `${words[i]} ${words[i + 1]}`;
                if (bigram.length > 8) { // Meaningful length
                    phrases.add(bigram);
                }
            }
            
            // Extract trigrams (3-word phrases)
            for (let i = 0; i < words.length - 2; i++) {
                const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
                if (trigram.length > 12) { // Meaningful length
                    phrases.add(trigram);
                }
            }
        });
        
        return Array.from(phrases);
    }

    /**
     * Categorize keywords based on context
     */
    categorizeKeyword(word, text) {
        const wordLower = word.toLowerCase();
        const context = this.getWordContext(wordLower, text);
        
        // Simple categorization based on patterns
        if (/^(chapter|section|part|unit|lesson)/.test(context)) {
            return 'structure';
        } else if (/^(define|definition|means|refers|called)/.test(context)) {
            return 'definition';
        } else if (/^(important|key|critical|essential|main)/.test(context)) {
            return 'important';
        } else if (/^(example|instance|such as|like)/.test(context)) {
            return 'example';
        } else if (/^(process|method|technique|approach|system)/.test(context)) {
            return 'process';
        }
        
        return 'concept';
    }

    /**
     * Get surrounding context of a word
     */
    getWordContext(word, text, contextLength = 50) {
        const index = text.toLowerCase().indexOf(word);
        if (index === -1) return '';
        
        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + word.length + contextLength);
        
        return text.substring(start, end).toLowerCase();
    }

    /**
     * Build hierarchical relationships between keywords with enhanced structure
     */
    buildHierarchy(keywords, text) {
        const hierarchy = {
            root: {
                id: 'root',
                label: 'Document Overview',
                level: 0,
                type: 'root',
                children: []
            }
        };
        
        // 1. Add Document Summary Node
        const summaryNode = this.createSummaryNode(keywords, text);
        hierarchy.root.children.push(summaryNode);
        
        // 2. Add Main Topics Node
        const topicsNode = this.createTopicsNode(keywords, text);
        hierarchy.root.children.push(topicsNode);
        
        // 3. Add Workflow/Process Node (if processes exist)
        const workflowNode = this.createWorkflowNode(keywords, text);
        if (workflowNode.children.length > 0) {
            hierarchy.root.children.push(workflowNode);
        }
        
        // 4. Add Detailed Concepts by Category
        const categoryNodes = this.createCategoryNodes(keywords, text);
        hierarchy.root.children.push(...categoryNodes);
        
        return hierarchy;
    }

    /**
     * Create summary node with key information
     */
    createSummaryNode(keywords, text) {
        const topKeywords = keywords.slice(0, 5);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        return {
            id: 'summary',
            label: '📋 Document Summary',
            level: 1,
            type: 'summary',
            children: [
                {
                    id: 'summary_main',
                    label: `Main Topic: ${topKeywords[0]?.word || 'General'}`,
                    level: 2,
                    type: 'info',
                    score: topKeywords[0]?.score || 1
                },
                {
                    id: 'summary_length',
                    label: `Content: ${sentences.length} sentences`,
                    level: 2,
                    type: 'info'
                },
                {
                    id: 'summary_keywords',
                    label: `Key Terms: ${keywords.length} identified`,
                    level: 2,
                    type: 'info'
                }
            ]
        };
    }

    /**
     * Create main topics node
     */
    createTopicsNode(keywords, text) {
        const topKeywords = keywords.slice(0, 5);
        
        return {
            id: 'topics',
            label: '🎯 Main Topics',
            level: 1,
            type: 'topics',
            children: topKeywords.map((kw, index) => ({
                id: `topic_${index}`,
                label: `${index + 1}. ${kw.word}`,
                level: 2,
                type: 'topic',
                score: kw.score,
                category: kw.category,
                relatedTerms: kw.relatedTerms || []
            }))
        };
    }

    /**
     * Create workflow/process node
     */
    createWorkflowNode(keywords, text) {
        const processKeywords = keywords.filter(kw => kw.category === 'process');
        const sentences = text.split(/[.!?]+/);
        
        // Look for sequential indicators
        const sequenceWords = ['first', 'second', 'third', 'then', 'next', 'finally', 'step'];
        const sequenceSentences = sentences.filter(s => 
            sequenceWords.some(word => s.toLowerCase().includes(word))
        );
        
        const children = [];
        
        // Add process keywords
        processKeywords.slice(0, 3).forEach((kw, index) => {
            children.push({
                id: `workflow_${index}`,
                label: `${index + 1}. ${kw.word}`,
                level: 2,
                type: 'process',
                score: kw.score
            });
        });
        
        // Add sequence steps if found
        if (sequenceSentences.length > 0) {
            sequenceSentences.slice(0, 3).forEach((sentence, index) => {
                const shortSentence = sentence.trim().substring(0, 50) + '...';
                children.push({
                    id: `step_${index}`,
                    label: `Step ${index + 1}: ${shortSentence}`,
                    level: 2,
                    type: 'step'
                });
            });
        }
        
        return {
            id: 'workflow',
            label: '⚙️ Workflow & Processes',
            level: 1,
            type: 'workflow',
            children: children
        };
    }

    /**
     * Create category nodes with keywords
     */
    createCategoryNodes(keywords, text) {
        const categoryGroups = {};
        keywords.forEach(kw => {
            if (!categoryGroups[kw.category]) {
                categoryGroups[kw.category] = [];
            }
            categoryGroups[kw.category].push(kw);
        });
        
        const categoryNodes = [];
        
        Object.entries(categoryGroups).forEach(([category, kws]) => {
            const categoryNode = {
                id: `cat_${category}`,
                label: `📚 ${this.formatCategory(category)}`,
                level: 1,
                type: 'category',
                children: []
            };
            
            // Add top keywords from this category
            kws.slice(0, 5).forEach((kw, kwIndex) => {
                const keywordNode = {
                    id: `kw_${category}_${kw.word}`,
                    label: kw.word,
                    score: kw.score,
                    level: 2,
                    type: 'keyword',
                    category: category,
                    relatedTerms: this.findRelatedTerms(kw.word, text, keywords)
                };
                
                categoryNode.children.push(keywordNode);
            });
            
            categoryNodes.push(categoryNode);
        });
        
        return categoryNodes;
    }

    /**
     * Find terms related to a keyword based on co-occurrence
     */
    findRelatedTerms(keyword, text, allKeywords, maxRelated = 3) {
        const related = [];
        const sentences = text.split(/[.!?]+/);
        
        // Find sentences containing the keyword
        const keywordSentences = sentences.filter(s => 
            s.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Find other keywords that appear in the same sentences
        allKeywords.forEach(kw => {
            if (kw.word !== keyword) {
                const coOccurrence = keywordSentences.filter(s =>
                    s.toLowerCase().includes(kw.word.toLowerCase())
                ).length;
                
                if (coOccurrence > 0) {
                    related.push({
                        word: kw.word,
                        strength: coOccurrence
                    });
                }
            }
        });
        
        return related
            .sort((a, b) => b.strength - a.strength)
            .slice(0, maxRelated)
            .map(r => r.word);
    }

    formatCategory(category) {
        const categoryNames = {
            'structure': 'Document Structure',
            'definition': 'Definitions',
            'important': 'Key Concepts',
            'example': 'Examples',
            'process': 'Processes & Methods',
            'concept': 'General Concepts'
        };
        
        return categoryNames[category] || category;
    }

    /**
     * Convert hierarchy to graph format for visualization
     */
    hierarchyToGraph(hierarchy) {
        const nodes = [];
        const edges = [];
        let nodeId = 0;
        
        const traverse = (node, parentId = null, x = 0, y = 0, level = 0) => {
            const currentId = nodeId++;
            
            // Determine node properties based on level
            const nodeConfig = this.getNodeConfig(node, level);
            
            nodes.push({
                id: currentId,
                label: node.label,
                title: this.getNodeTooltip(node),
                level: level,
                x: x,
                y: y,
                ...nodeConfig
            });
            
            if (parentId !== null) {
                edges.push({
                    from: parentId,
                    to: currentId,
                    value: node.score || 1,
                    arrows: 'to'
                });
            }
            
            // Process children
            if (node.children && node.children.length > 0) {
                const angleStep = (2 * Math.PI) / node.children.length;
                const radius = 200 * (level + 1);
                
                node.children.forEach((child, index) => {
                    const angle = index * angleStep;
                    const childX = x + radius * Math.cos(angle);
                    const childY = y + radius * Math.sin(angle);
                    
                    traverse(child, currentId, childX, childY, level + 1);
                });
            }
        };
        
        traverse(hierarchy.root);
        
        return { nodes, edges };
    }

    getNodeConfig(node, level) {
        // Special styling based on node type
        if (node.type === 'root') {
            return {
                color: '#2c3e50',
                size: 50,
                font: { size: 20, color: '#ffffff', bold: true },
                shape: 'box',
                borderWidth: 3
            };
        }
        
        if (node.type === 'summary') {
            return {
                color: '#9b59b6',
                size: 35,
                font: { size: 16, color: '#ffffff' },
                shape: 'box',
                borderWidth: 2
            };
        }
        
        if (node.type === 'topics') {
            return {
                color: '#e74c3c',
                size: 35,
                font: { size: 16, color: '#ffffff' },
                shape: 'box',
                borderWidth: 2
            };
        }
        
        if (node.type === 'workflow') {
            return {
                color: '#1abc9c',
                size: 35,
                font: { size: 16, color: '#ffffff' },
                shape: 'box',
                borderWidth: 2
            };
        }
        
        if (node.type === 'category') {
            return {
                color: '#3498db',
                size: 30,
                font: { size: 14, color: '#ffffff' },
                shape: 'ellipse',
                borderWidth: 2
            };
        }
        
        if (node.type === 'info' || node.type === 'topic' || node.type === 'process' || node.type === 'step') {
            return {
                color: '#f39c12',
                size: 25,
                font: { size: 12 },
                shape: 'diamond'
            };
        }
        
        // Default keyword styling
        const configs = {
            0: { // Root
                color: '#2c3e50',
                size: 40,
                font: { size: 18, color: '#ffffff' },
                shape: 'box'
            },
            1: { // Category
                color: '#3498db',
                size: 30,
                font: { size: 14, color: '#ffffff' },
                shape: 'ellipse'
            },
            2: { // Keyword
                color: this.getCategoryColor(node.category),
                size: 20 + (node.score || 0) * 10,
                font: { size: 12 },
                shape: 'dot'
            }
        };
        
        return configs[level] || configs[2];
    }

    getCategoryColor(category) {
        const colors = {
            'structure': '#9b59b6',
            'definition': '#2ecc71',
            'important': '#e74c3c',
            'example': '#f39c12',
            'process': '#1abc9c',
            'concept': '#34495e'
        };
        
        return colors[category] || '#95a5a6';
    }

    getNodeTooltip(node) {
        if (node.type === 'root') {
            return 'Document Overview\nClick to see all main sections';
        }
        
        if (node.type === 'summary') {
            return 'Document Summary\nKey statistics and overview';
        }
        
        if (node.type === 'topics') {
            return 'Main Topics\nMost important concepts in the document';
        }
        
        if (node.type === 'workflow') {
            return 'Workflow & Processes\nSequential steps and methods';
        }
        
        if (node.type === 'category') {
            return `${node.label}\nClick to see related keywords`;
        }
        
        if (node.type === 'topic') {
            let tooltip = `Topic: ${node.label}\nImportance: ${(node.score * 100).toFixed(1)}%`;
            if (node.relatedTerms && node.relatedTerms.length > 0) {
                tooltip += `\nRelated: ${node.relatedTerms.join(', ')}`;
            }
            return tooltip;
        }
        
        if (node.type === 'process' || node.type === 'step') {
            return `${node.label}\nPart of the workflow`;
        }
        
        if (node.type === 'keyword') {
            let tooltip = `Keyword: ${node.label}\nScore: ${node.score}\nCategory: ${node.category}`;
            if (node.relatedTerms && node.relatedTerms.length > 0) {
                tooltip += `\nRelated: ${node.relatedTerms.join(', ')}`;
            }
            return tooltip;
        }
        
        return node.label;
    }
}

module.exports = KeywordExtractor;
