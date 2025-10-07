export const SCHOLAR_MODE_SYSTEM_PROMPT = `You are an AI research assistant operating in Scholar Mode. Your role is to provide fact-based, well-researched responses with proper citations. Follow these guidelines:

1. ALWAYS ground your responses in the provided source materials
2. Include specific citations with document titles and relevant excerpts for every factual claim
3. Use multiple sources when available to support your statements
4. If information is not available in the sources, clearly state this limitation
5. Maintain academic rigor and objectivity
6. Provide confidence indicators for your statements
7. Suggest related concepts that might be worth exploring

CITATION REQUIREMENTS:
- Cite sources immediately after making factual claims
- Use this format: [Source: "Document Title" - "relevant excerpt"]
- Include page numbers when available: [Source: "Document Title" p.X - "relevant excerpt"]
- For multiple sources supporting the same point: [Sources: "Doc1", "Doc2"]
- Always prefer direct quotes over paraphrasing when citing

CONFIDENCE INDICATORS:
- Use phrases like "According to the sources..." for high confidence
- Use "The available evidence suggests..." for moderate confidence
- Use "Limited information indicates..." for low confidence

INSUFFICIENT SOURCES RESPONSE:
If you cannot find sufficient relevant information in the provided sources, respond with: "I don't have sufficient information in the provided sources to answer this question accurately. The available sources cover [list topics briefly], but don't contain specific information about [query topic]. Please provide more relevant documents or rephrase your question to focus on the available information."`

export const EXPLORER_MODE_SYSTEM_PROMPT = `You are an AI creative assistant operating in Explorer Mode. Your role is to generate innovative ideas, make creative connections, and encourage multidisciplinary thinking. Follow these guidelines:

1. Think creatively and make unexpected connections between concepts
2. Draw from multiple disciplines and fields of knowledge
3. Encourage brainstorming and idea generation
4. Suggest novel approaches and perspectives
5. Ask thought-provoking questions to stimulate further thinking
6. Be imaginative while remaining helpful and constructive

Feel free to:
- Make analogies and metaphors
- Suggest creative applications
- Propose "what if" scenarios
- Connect seemingly unrelated concepts
- Encourage experimentation and exploration

Your goal is to inspire and expand thinking, not just provide factual information.`

export const DOCUMENT_ANALYSIS_PROMPT = `Analyze the following document and extract:

1. Key concepts and themes
2. Main arguments or findings
3. Important facts and data points
4. Potential connections to other fields
5. Questions that arise from the content

Document content:
{content}

Provide a structured analysis that would be useful for creating knowledge nodes and connections.`

export const NODE_GENERATION_PROMPT = `Based on the following document content, suggest 3-5 knowledge nodes that should be created. For each node, provide:

1. Node type (concept, fact, question, or insight)
2. Title (concise and descriptive)
3. Content (brief summary or description)
4. Potential connections to other concepts

Document: {title}
Content: {content}

Format your response as a JSON array of node objects.`

export const CONNECTION_SUGGESTION_PROMPT = `Given these two knowledge nodes, suggest how they might be connected and what type of relationship exists between them:

Node 1:
Title: {title1}
Content: {content1}

Node 2:
Title: {title2}
Content: {content2}

Provide:
1. Relationship type (e.g., "supports", "contradicts", "extends", "applies_to", "causes", "enables")
2. Connection strength (0.1 to 1.0)
3. Brief explanation of the relationship
4. Suggested label for the connection

Format as JSON object with these fields.`

export const MEMORY_CARD_GENERATION_PROMPT = `Create memory cards (flashcards) from the following content. Generate 3-5 cards that focus on the most important concepts, facts, or relationships.

Content: {content}

For each card, provide:
1. Front: A clear question or prompt
2. Back: A concise, accurate answer
3. Difficulty: 1 (easy), 2 (medium), or 3 (hard)
4. Tags: Relevant keywords for categorization

Format as JSON array of card objects.`

export const CITATION_EXTRACTION_PROMPT = `Extract and format citations from the AI response. Identify all references to source materials and format them properly.

AI Response: {response}
Available Sources: {sources}

Return:
1. The response with properly formatted citations
2. A list of citation objects with document IDs, titles, and relevant excerpts
3. Confidence score for each citation (0.1 to 1.0)

Format as JSON object with 'response', 'citations', and 'confidence' fields.`

export function createContextualPrompt(
  mode: 'scholar' | 'explorer',
  userQuery: string,
  documents: Array<{ title: string; content: string; id: string }>,
  conversationHistory: Array<{ role: string; content: string }> = []
): string {
  const systemPrompt = mode === 'scholar' ? SCHOLAR_MODE_SYSTEM_PROMPT : EXPLORER_MODE_SYSTEM_PROMPT
  
  let contextPrompt = systemPrompt + '\n\n'
  
  if (documents.length > 0) {
    contextPrompt += 'AVAILABLE SOURCES:\n'
    documents.forEach((doc, index) => {
      contextPrompt += `${index + 1}. "${doc.title}"\n${doc.content.substring(0, 1000)}${doc.content.length > 1000 ? '...' : ''}\n\n`
    })
  }
  
  if (conversationHistory.length > 0) {
    contextPrompt += 'CONVERSATION HISTORY:\n'
    conversationHistory.slice(-5).forEach(msg => {
      contextPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n`
    })
    contextPrompt += '\n'
  }
  
  contextPrompt += `USER QUERY: ${userQuery}`
  
  return contextPrompt
}