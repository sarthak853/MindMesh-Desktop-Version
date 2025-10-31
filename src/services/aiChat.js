class AIChatService {
    constructor() {
        this.conversationHistory = [];
        this.apiKey = null;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    async generateResponse(message, context = null) {
        try {
            // Add user message to history
            this.conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date()
            });

            let response;
            
            if (this.apiKey) {
                response = await this.callGeminiAPI(message, context);
            } else {
                response = this.generateMockResponse(message, context);
            }

            // Add AI response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: new Date()
            });

            return response;
        } catch (error) {
            console.error('AI Chat error:', error);
            return "I'm sorry, I encountered an error. Please try again.";
        }
    }

    async callGeminiAPI(message, context) {
        // This would require the Google Generative AI package
        // For now, return a mock response
        return this.generateMockResponse(message, context);
    }

    generateMockResponse(message, context) {
        const lowerMessage = message.toLowerCase();

        // Context-aware responses
        if (context && context.concepts && context.concepts.length > 0) {
            const conceptTitles = context.concepts.map(c => c.title).join(', ');
            
            if (lowerMessage.includes('what') || lowerMessage.includes('explain')) {
                return `Based on your study materials, I can help explain concepts like: ${conceptTitles}. Which specific topic would you like me to elaborate on?`;
            }
            
            if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
                return `Here's a summary of your content: You have ${context.concepts.length} key concepts including ${conceptTitles}. The main themes appear to focus on learning and knowledge retention.`;
            }
        }

        // General responses
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm your AI learning assistant. I can help you understand your study materials, create flashcards, and answer questions about your content.";
        }

        if (lowerMessage.includes('help')) {
            return "I can help you with:\n• Explaining concepts from your documents\n• Creating study strategies\n• Answering questions about your materials\n• Suggesting learning techniques\n\nWhat would you like to know?";
        }

        if (lowerMessage.includes('flashcard') || lowerMessage.includes('study')) {
            return "Great! I can help you create effective flashcards and study strategies. Based on your uploaded content, I recommend focusing on the key concepts and using spaced repetition for better retention.";
        }

        if (lowerMessage.includes('concept') || lowerMessage.includes('understand')) {
            return "I'd be happy to help you understand concepts better! If you have specific content uploaded, I can explain the key ideas and how they relate to each other.";
        }

        // Default response
        return "That's an interesting question! While I'd love to provide more detailed responses, I'm currently running in demo mode. For full AI capabilities, please configure the Gemini API key in settings.";
    }

    getConversationHistory() {
        return this.conversationHistory;
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    generateStudySuggestions(concepts) {
        if (!concepts || concepts.length === 0) {
            return ["Upload some study materials to get personalized suggestions!"];
        }

        const suggestions = [
            `You have ${concepts.length} concepts to study. Consider breaking them into smaller groups.`,
            "Use the cognitive map to visualize relationships between concepts.",
            "Review flashcards regularly using spaced repetition.",
            "Focus on understanding connections between different topics."
        ];

        if (concepts.length > 10) {
            suggestions.unshift("You have many concepts to study. Consider prioritizing the most important ones first.");
        }

        return suggestions;
    }
}

module.exports = AIChatService;