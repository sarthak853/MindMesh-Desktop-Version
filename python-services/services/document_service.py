import os
import asyncio
from typing import List, Dict, Any, Optional
import httpx
import PyPDF2
import docx
import markdown
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import re
import logging

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self):
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
    async def extract_text_from_file(self, file_path: str, file_type: str) -> str:
        """Extract text content from various file types"""
        try:
            if file_type == 'pdf':
                return await self._extract_pdf_text(file_path)
            elif file_type == 'docx':
                return await self._extract_docx_text(file_path)
            elif file_type == 'txt':
                return await self._extract_txt_text(file_path)
            elif file_type == 'md':
                return await self._extract_markdown_text(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            raise
    
    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            logger.error(f"Error reading PDF {file_path}: {str(e)}")
            raise
        return text.strip()
    
    async def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error reading DOCX {file_path}: {str(e)}")
            raise
    
    async def _extract_txt_text(self, file_path: str) -> str:
        """Extract text from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except Exception as e:
            logger.error(f"Error reading TXT {file_path}: {str(e)}")
            raise
    
    async def _extract_markdown_text(self, file_path: str) -> str:
        """Extract text from Markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                md_content = file.read()
                html = markdown.markdown(md_content)
                soup = BeautifulSoup(html, 'html.parser')
                return soup.get_text().strip()
        except Exception as e:
            logger.error(f"Error reading Markdown {file_path}: {str(e)}")
            raise
    
    async def extract_web_content(self, url: str) -> Dict[str, Any]:
        """Extract content from web URL"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={'User-Agent': 'MindMesh Bot 1.0'},
                    follow_redirects=True
                )
                response.raise_for_status()
                
                content_type = response.headers.get('content-type', '').lower()
                
                if 'text/html' in content_type:
                    return await self._extract_html_content(response.text, url)
                elif 'text/plain' in content_type:
                    return {
                        'title': url.split('/')[-1] or url,
                        'content': response.text,
                        'metadata': {
                            'url': url,
                            'content_type': content_type,
                            'domain': httpx.URL(url).host
                        }
                    }
                else:
                    raise ValueError(f"Unsupported content type: {content_type}")
                    
        except Exception as e:
            logger.error(f"Error extracting web content from {url}: {str(e)}")
            raise
    
    async def _extract_html_content(self, html: str, url: str) -> Dict[str, Any]:
        """Extract structured content from HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Extract title
        title_tag = soup.find('title')
        title = title_tag.get_text().strip() if title_tag else httpx.URL(url).host
        
        # Extract main content
        content_selectors = [
            'article', 'main', '.content', '#content', 
            '.post', '.article', '.entry-content'
        ]
        
        content = ""
        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                content = content_elem.get_text(separator='\n', strip=True)
                break
        
        # Fallback to body content
        if not content:
            body = soup.find('body')
            if body:
                content = body.get_text(separator='\n', strip=True)
        
        # Extract metadata
        metadata = {
            'url': url,
            'domain': httpx.URL(url).host,
            'content_type': 'text/html'
        }
        
        # Extract meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            metadata['description'] = meta_desc.get('content', '')
        
        # Extract meta keywords
        meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
        if meta_keywords:
            metadata['keywords'] = meta_keywords.get('content', '')
        
        return {
            'title': title,
            'content': content,
            'metadata': metadata
        }
    
    def generate_embeddings(self, text: str) -> List[float]:
        """Generate embeddings for text using sentence transformer"""
        try:
            # Clean and preprocess text
            cleaned_text = self._clean_text(text)
            
            # Generate embeddings
            embeddings = self.embedding_model.encode(cleaned_text)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise
    
    def _clean_text(self, text: str) -> str:
        """Clean and preprocess text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:()\-]', '', text)
        
        # Limit length to avoid memory issues
        if len(text) > 10000:
            text = text[:10000] + "..."
        
        return text.strip()
    
    def extract_key_concepts(self, text: str, num_concepts: int = 10) -> List[Dict[str, Any]]:
        """Extract key concepts from text using TF-IDF and clustering"""
        try:
            # Clean text
            cleaned_text = self._clean_text(text)
            
            # Split into sentences
            sentences = self._split_into_sentences(cleaned_text)
            
            if len(sentences) < 2:
                return []
            
            # Generate TF-IDF vectors
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(sentences)
            
            # Get feature names (terms)
            feature_names = self.tfidf_vectorizer.get_feature_names_out()
            
            # Calculate term importance scores
            term_scores = np.mean(tfidf_matrix.toarray(), axis=0)
            
            # Get top terms
            top_indices = np.argsort(term_scores)[-num_concepts:][::-1]
            
            concepts = []
            for idx in top_indices:
                term = feature_names[idx]
                score = term_scores[idx]
                
                # Find sentences containing this term
                relevant_sentences = [
                    sent for sent in sentences 
                    if term.lower() in sent.lower()
                ][:3]  # Limit to 3 sentences
                
                concepts.append({
                    'term': term,
                    'score': float(score),
                    'context': relevant_sentences,
                    'type': self._classify_concept_type(term)
                })
            
            return concepts
            
        except Exception as e:
            logger.error(f"Error extracting key concepts: {str(e)}")
            return []
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]
        return sentences
    
    def _classify_concept_type(self, term: str) -> str:
        """Classify concept type based on term characteristics"""
        term_lower = term.lower()
        
        # Technical terms (contain numbers, technical suffixes)
        if re.search(r'\d', term) or any(suffix in term_lower for suffix in ['tion', 'ment', 'ness', 'ity']):
            return 'technical'
        
        # Proper nouns (capitalized)
        if term[0].isupper():
            return 'entity'
        
        # Multi-word concepts
        if ' ' in term:
            return 'concept'
        
        return 'keyword'
    
    def analyze_document_structure(self, text: str) -> Dict[str, Any]:
        """Analyze document structure and extract sections"""
        try:
            lines = text.split('\n')
            
            structure = {
                'sections': [],
                'headings': [],
                'paragraphs': [],
                'lists': [],
                'statistics': {
                    'word_count': len(text.split()),
                    'sentence_count': len(self._split_into_sentences(text)),
                    'paragraph_count': 0,
                    'heading_count': 0
                }
            }
            
            current_section = None
            current_paragraph = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    if current_paragraph:
                        structure['paragraphs'].append(' '.join(current_paragraph))
                        current_paragraph = []
                    continue
                
                # Detect headings (simple heuristic)
                if self._is_heading(line):
                    structure['headings'].append(line)
                    structure['statistics']['heading_count'] += 1
                    
                    if current_paragraph:
                        structure['paragraphs'].append(' '.join(current_paragraph))
                        current_paragraph = []
                    
                    if current_section:
                        structure['sections'].append(current_section)
                    
                    current_section = {
                        'title': line,
                        'content': []
                    }
                
                # Detect lists
                elif self._is_list_item(line):
                    structure['lists'].append(line)
                    if current_section:
                        current_section['content'].append(line)
                
                else:
                    current_paragraph.append(line)
                    if current_section:
                        current_section['content'].append(line)
            
            # Add final paragraph and section
            if current_paragraph:
                structure['paragraphs'].append(' '.join(current_paragraph))
            
            if current_section:
                structure['sections'].append(current_section)
            
            structure['statistics']['paragraph_count'] = len(structure['paragraphs'])
            
            return structure
            
        except Exception as e:
            logger.error(f"Error analyzing document structure: {str(e)}")
            return {'sections': [], 'headings': [], 'paragraphs': [], 'lists': [], 'statistics': {}}
    
    def _is_heading(self, line: str) -> bool:
        """Detect if line is a heading"""
        # Markdown-style headings
        if line.startswith('#'):
            return True
        
        # All caps (likely heading)
        if line.isupper() and len(line.split()) <= 10:
            return True
        
        # Short line followed by special characters
        if len(line) < 100 and not line.endswith('.'):
            return True
        
        return False
    
    def _is_list_item(self, line: str) -> bool:
        """Detect if line is a list item"""
        return (line.startswith('- ') or 
                line.startswith('* ') or 
                line.startswith('+ ') or 
                re.match(r'^\d+\.\s', line))
    
    def generate_summary(self, text: str, max_sentences: int = 3) -> str:
        """Generate a summary of the text"""
        try:
            sentences = self._split_into_sentences(text)
            
            if len(sentences) <= max_sentences:
                return '. '.join(sentences) + '.'
            
            # Simple extractive summarization using TF-IDF
            if len(sentences) < 2:
                return text[:200] + "..." if len(text) > 200 else text
            
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(sentences)
            
            # Calculate sentence scores
            sentence_scores = np.sum(tfidf_matrix.toarray(), axis=1)
            
            # Get top sentences
            top_indices = np.argsort(sentence_scores)[-max_sentences:]
            top_indices = sorted(top_indices)  # Maintain original order
            
            summary_sentences = [sentences[i] for i in top_indices]
            return '. '.join(summary_sentences) + '.'
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return text[:200] + "..." if len(text) > 200 else text
    
    def find_similar_documents(self, query_embedding: List[float], 
                             document_embeddings: List[List[float]], 
                             threshold: float = 0.7) -> List[int]:
        """Find similar documents based on embeddings"""
        try:
            query_vec = np.array(query_embedding)
            doc_vecs = np.array(document_embeddings)
            
            # Calculate cosine similarity
            similarities = np.dot(doc_vecs, query_vec) / (
                np.linalg.norm(doc_vecs, axis=1) * np.linalg.norm(query_vec)
            )
            
            # Find documents above threshold
            similar_indices = np.where(similarities >= threshold)[0]
            
            # Sort by similarity score
            similar_indices = similar_indices[np.argsort(similarities[similar_indices])[::-1]]
            
            return similar_indices.tolist()
            
        except Exception as e:
            logger.error(f"Error finding similar documents: {str(e)}")
            return []