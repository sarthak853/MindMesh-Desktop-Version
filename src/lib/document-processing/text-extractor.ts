export class TextExtractor {
  static async extractFromFile(file: File): Promise<string> {
    const fileType = file.type
    const fileName = file.name.toLowerCase()

    try {
      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await this.extractFromText(file)
      } else if (fileName.endsWith('.md')) {
        return await this.extractFromMarkdown(file)
      } else if (fileType === 'application/pdf') {
        return await this.extractFromPDF(file)
      } else if (fileType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        return await this.extractFromWord(file)
      } else {
        throw new Error(`Unsupported file type: ${fileType}`)
      }
    } catch (error) {
      console.error('Error extracting text from file:', error)
      throw new Error(`Failed to extract text from ${file.name}`)
    }
  }

  private static async extractFromText(file: File): Promise<string> {
    return await file.text()
  }

  private static async extractFromMarkdown(file: File): Promise<string> {
    const content = await file.text()
    // Basic markdown processing - remove markdown syntax for plain text
    return content
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .trim()
  }

  private static async extractFromPDF(file: File): Promise<string> {
    // In a real implementation, you would use a library like pdf-parse
    // For now, we'll return a placeholder
    console.warn('PDF extraction not implemented. Using placeholder text.')
    return `PDF Document: ${file.name}

This is a placeholder for PDF content extraction. In a production environment, 
you would use a library like pdf-parse to extract the actual text content from the PDF file.

The PDF file "${file.name}" (${Math.round(file.size / 1024)}KB) would be processed here 
to extract all readable text content, maintaining the document structure where possible.

To implement PDF extraction:
1. Install pdf-parse: npm install pdf-parse
2. Import and use the library to extract text
3. Handle multi-page documents appropriately
4. Preserve formatting and structure where relevant`
  }

  private static async extractFromWord(file: File): Promise<string> {
    // In a real implementation, you would use a library like mammoth
    console.warn('Word document extraction not implemented. Using placeholder text.')
    return `Word Document: ${file.name}

This is a placeholder for Word document content extraction. In a production environment, 
you would use a library like mammoth to extract the actual text content from Word documents.

The document "${file.name}" (${Math.round(file.size / 1024)}KB) would be processed here 
to extract all readable text content, including:
- Paragraphs and headings
- Lists and tables
- Text formatting (converted to plain text)
- Comments and footnotes

To implement Word document extraction:
1. Install mammoth: npm install mammoth
2. Import and use the library to extract text
3. Handle different Word document formats (.doc, .docx)
4. Convert formatting to plain text or markdown`
  }

  static async extractFromUrl(url: string): Promise<{ title: string; content: string; metadata: any }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MindMesh Bot 1.0',
        },
        signal: AbortSignal.timeout(15000), // 15 seconds timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('text/html')) {
        return await this.extractFromHTML(await response.text(), url)
      } else if (contentType.includes('text/plain')) {
        const content = await response.text()
        const urlObj = new URL(url)
        return {
          title: urlObj.pathname.split('/').pop() || urlObj.hostname,
          content,
          metadata: {
            url,
            contentType,
            domain: urlObj.hostname,
            fetchedAt: new Date(),
          }
        }
      } else {
        throw new Error(`Unsupported content type: ${contentType}`)
      }
    } catch (error) {
      console.error('Error extracting content from URL:', error)
      throw new Error(`Failed to extract content from ${url}`)
    }
  }

  private static async extractFromHTML(html: string, url: string): Promise<{ title: string; content: string; metadata: any }> {
    // Basic HTML parsing - in production, use a proper HTML parser like cheerio
    const urlObj = new URL(url)
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : urlObj.hostname

    // Extract meta description
    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    const description = descriptionMatch ? descriptionMatch[1] : ''

    // Extract main content
    let content = html
      // Remove script and style tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Convert common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()

    // Limit content length
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '...'
    }

    return {
      title,
      content: description ? `${description}\n\n${content}` : content,
      metadata: {
        url,
        domain: urlObj.hostname,
        title,
        description,
        fetchedAt: new Date(),
        contentLength: content.length,
      }
    }
  }

  static cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with processing
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim
      .trim()
  }

  static extractKeywords(text: string, limit: number = 20): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))

    // Count word frequency
    const wordCount: { [key: string]: number } = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    // Return most frequent words
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([word]) => word)
  }

  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'shall', 'from', 'up', 'out', 'down', 'off', 'over',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
      'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'now', 'also', 'well', 'first', 'last', 'new', 'old', 'good', 'great', 'small',
      'large', 'big', 'long', 'short', 'high', 'low', 'right', 'left', 'next', 'previous'
    ])
    
    return stopWords.has(word.toLowerCase())
  }
}