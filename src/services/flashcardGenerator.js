class FlashcardGenerator {
    constructor() {
        this.questionTemplates = {
            definition: [
                'What is {term}?',
                'Define {term}.',
                'Explain the concept of {term}.',
                'What does {term} mean?'
            ],
            relationship: [
                'How is {term1} related to {term2}?',
                'What is the connection between {term1} and {term2}?',
                'Compare {term1} and {term2}.'
            ],
            application: [
                'How would you apply {term}?',
                'Give an example of {term} in practice.',
                'When would you use {term}?'
            ],
            recall: [
                'List the key aspects of {term}.',
                'What are the main characteristics of {term}?',
                'Identify the components of {term}.'
            ]
        };
    }

    /**
     * Generate flashcards from keywords and text
     */
    generateFlashcards(keywords, text, hierarchy) {
        const flashcards = [];
        
        // Generate definition flashcards for top keywords
        keywords.slice(0, 15).forEach((kw, index) => {
            const context = this.extractContext(kw.word, text);
            
            // Definition flashcard
            flashcards.push({
                id: `fc_def_${index}`,
                type: 'definition',
                keyword: kw.word,
                question: this.randomTemplate('definition', { term: kw.word }),
                answer: context.definition || `${kw.word} is a ${kw.category} mentioned in the document.`,
                difficulty: this.calculateDifficulty(kw.score),
                category: kw.category,
                relatedTerms: kw.relatedTerms || []
            });
            
            // Context-based flashcard
            if (context.sentence) {
                flashcards.push({
                    id: `fc_context_${index}`,
                    type: 'fill-in-blank',
                    keyword: kw.word,
                    question: this.createFillInBlank(context.sentence, kw.word),
                    answer: kw.word,
                    difficulty: 'medium',
                    category: kw.category,
                    hint: `This is a ${kw.category} term`
                });
            }
        });
        
        // Generate relationship flashcards
        const relationshipCards = this.generateRelationshipCards(keywords, hierarchy, text);
        flashcards.push(...relationshipCards);
        
        // Generate category-based flashcards
        const categoryCards = this.generateCategoryCards(keywords);
        flashcards.push(...categoryCards);
        
        return flashcards;
    }

    /**
     * Extract context around a keyword with better definition extraction
     */
    extractContext(keyword, text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        // Find all sentences containing the keyword
        const keywordSentences = sentences.filter(s => 
            s.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (keywordSentences.length === 0) {
            return { sentence: null, definition: null, context: null };
        }
        
        // Use the first sentence as primary
        const keywordSentence = keywordSentences[0];
        
        // Try multiple definition patterns
        const definitionPatterns = [
            // "X is Y" pattern
            new RegExp(`${this.escapeRegex(keyword)}\\s+is\\s+([^.!?]+)`, 'i'),
            // "X refers to Y" pattern
            new RegExp(`${this.escapeRegex(keyword)}\\s+refers?\\s+to\\s+([^.!?]+)`, 'i'),
            // "X means Y" pattern
            new RegExp(`${this.escapeRegex(keyword)}\\s+means?\\s+([^.!?]+)`, 'i'),
            // "X: Y" or "X, Y" pattern
            new RegExp(`${this.escapeRegex(keyword)}[,:]\\s+([^.!?]+)`, 'i'),
            // "X can be defined as Y" pattern
            new RegExp(`${this.escapeRegex(keyword)}\\s+(?:can be|is)\\s+defined\\s+as\\s+([^.!?]+)`, 'i'),
            // "X represents Y" pattern
            new RegExp(`${this.escapeRegex(keyword)}\\s+represents?\\s+([^.!?]+)`, 'i'),
            // "X involves Y" pattern
            new RegExp(`${this.escapeRegex(keyword)}\\s+involves?\\s+([^.!?]+)`, 'i'),
            // "X includes Y" pattern
            new RegExp(`${this.escapeRegex(keyword)}\\s+includes?\\s+([^.!?]+)`, 'i')
        ];
        
        let definition = null;
        
        // Try to find definition in all sentences containing the keyword
        for (const sentence of keywordSentences) {
            for (const pattern of definitionPatterns) {
                const match = sentence.match(pattern);
                if (match && match[1].trim().length > 10) {
                    definition = match[1].trim();
                    break;
                }
            }
            if (definition) break;
        }
        
        // If no pattern match, use the full sentence as definition
        if (!definition && keywordSentence.length > 20) {
            definition = keywordSentence.trim();
        }
        
        // Get surrounding context (sentence before and after)
        const index = sentences.indexOf(keywordSentence);
        const contextSentences = [];
        if (index > 0) contextSentences.push(sentences[index - 1]);
        contextSentences.push(keywordSentence);
        if (index < sentences.length - 1) contextSentences.push(sentences[index + 1]);
        
        const context = contextSentences.join('. ').trim();
        
        return {
            sentence: keywordSentence.trim(),
            definition: definition,
            context: context
        };
    }

    /**
     * Escape special regex characters
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Create fill-in-the-blank question
     */
    createFillInBlank(sentence, keyword) {
        const blank = '_____';
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        return sentence.replace(regex, blank);
    }

    /**
     * Generate flashcards about relationships between keywords with better context
     */
    generateRelationshipCards(keywords, hierarchy, text) {
        const cards = [];
        let cardIndex = 0;
        
        // Find keywords with related terms
        keywords.forEach(kw => {
            if (kw.relatedTerms && kw.relatedTerms.length > 0 && cardIndex < 5) {
                const related = kw.relatedTerms[0]; // Use first related term
                
                // Find sentence containing both terms
                const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
                const relationSentence = sentences.find(s => 
                    s.toLowerCase().includes(kw.word.toLowerCase()) && 
                    s.toLowerCase().includes(related.toLowerCase())
                );
                
                let answer;
                if (relationSentence) {
                    answer = relationSentence.trim();
                } else {
                    // Get context for both terms
                    const context1 = this.extractContext(kw.word, text);
                    const context2 = this.extractContext(related, text);
                    answer = `${kw.word}: ${context1.definition || context1.sentence}. ${related}: ${context2.definition || context2.sentence}`;
                }
                
                cards.push({
                    id: `fc_rel_${cardIndex++}`,
                    type: 'relationship',
                    keyword: kw.word,
                    question: this.randomTemplate('relationship', {
                        term1: kw.word,
                        term2: related
                    }),
                    answer: answer,
                    difficulty: 'hard',
                    category: 'relationship',
                    relatedTerms: [kw.word, related]
                });
            }
        });
        
        return cards;
    }

    /**
     * Generate category-based flashcards
     */
    generateCategoryCards(keywords) {
        const cards = [];
        const categoryGroups = {};
        
        // Group keywords by category
        keywords.forEach(kw => {
            if (!categoryGroups[kw.category]) {
                categoryGroups[kw.category] = [];
            }
            categoryGroups[kw.category].push(kw.word);
        });
        
        // Create flashcards for each category
        Object.entries(categoryGroups).forEach(([category, terms], index) => {
            if (terms.length >= 2) {
                cards.push({
                    id: `fc_cat_${index}`,
                    type: 'recall',
                    keyword: category,
                    question: `List at least 3 ${this.formatCategory(category)} from the document.`,
                    answer: terms.slice(0, 5).join(', '),
                    difficulty: 'medium',
                    category: 'recall',
                    relatedTerms: terms
                });
            }
        });
        
        return cards;
    }

    /**
     * Calculate difficulty based on keyword score
     */
    calculateDifficulty(score) {
        if (score > 0.5) return 'easy';
        if (score > 0.2) return 'medium';
        return 'hard';
    }

    /**
     * Get random template
     */
    randomTemplate(type, params) {
        const templates = this.questionTemplates[type];
        if (!templates) return '';
        
        let template = templates[Math.floor(Math.random() * templates.length)];
        
        // Replace placeholders
        Object.entries(params).forEach(([key, value]) => {
            template = template.replace(`{${key}}`, value);
        });
        
        return template;
    }

    formatCategory(category) {
        const categoryNames = {
            'structure': 'structural elements',
            'definition': 'definitions',
            'important': 'key concepts',
            'example': 'examples',
            'process': 'processes',
            'concept': 'concepts'
        };
        
        return categoryNames[category] || category;
    }

    /**
     * Generate spaced repetition schedule
     */
    generateReviewSchedule(flashcard) {
        const now = new Date();
        const schedule = [];
        
        // Intervals in days based on difficulty
        const intervals = {
            'easy': [1, 3, 7, 14, 30],
            'medium': [1, 2, 5, 10, 21],
            'hard': [1, 1, 3, 7, 14]
        };
        
        const difficultyIntervals = intervals[flashcard.difficulty] || intervals['medium'];
        
        difficultyIntervals.forEach((days, index) => {
            const reviewDate = new Date(now);
            reviewDate.setDate(reviewDate.getDate() + days);
            
            schedule.push({
                reviewNumber: index + 1,
                date: reviewDate.toISOString(),
                completed: false
            });
        });
        
        return schedule;
    }
}

module.exports = FlashcardGenerator;
