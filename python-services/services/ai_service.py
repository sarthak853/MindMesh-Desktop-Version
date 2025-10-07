import asyncio
import os
from typing import List, Dict, Any, Optional, AsyncGenerator
import openai
from openai import AsyncOpenAI
import together
from datetime import datetime

class AIService:
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.together_api_key = os.getenv("TOGETHER_API_KEY")
        
        # Initialize Together AI if key is available
        if self.together_api_key:
            together.api_key = self.together_api_key
    
    async def chat(self, message: str, mode: str, context: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Main chat interface supporting Scholar and Explorer modes"""
        
        if mode == "scholar":
            return await self._scholar_mode_chat(message, context, user_id)
        elif mode == "explorer":
            return await self._explorer_mode_chat(message, context, user_id)
        else:
            raise ValueError(f"Unknown mode: {mode}")
    
    async def _scholar_mode_chat(self, message: str, context: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Scholar mode: Fact-based responses with citations"""
        
        # Get relevant documents from context
        documents = context.get("documents", [])
        conversation_history = context.get("conversation_history", [])
        
        # Build context from documents
        document_context = ""
        if documents:
            document_context = "\n\n".join([
                f"Document: {doc.get('title', 'Untitled')}\nContent: {doc.get('content', '')[:1000]}..."
                for doc in documents[:5]  # Limit to 5 most relevant documents
            ])
        
        # Build conversation history
        history_context = ""
        if conversation_history:
            history_context = "\n".join([
                f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
                for msg in conversation_history[-6:]  # Last 6 messages
            ])
        
        system_prompt = f"""You are a scholarly AI assistant in Scholar Mode. Your role is to provide accurate, well-researched responses based on the user's uploaded documents and knowledge base.

IMPORTANT GUIDELINES:
1. Base your responses primarily on the provided documents
2. Always cite your sources when making claims
3. If information is not available in the documents, clearly state this
4. Provide factual, evidence-based responses
5. Include confidence levels for your statements
6. Suggest related concepts that might be relevant

Available Documents:
{document_context}

Previous Conversation:
{history_context}

Current time: {datetime.now().isoformat()}"""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=1500
            )
            
            content = response.choices[0].message.content
            
            # Generate citations
            citations = await self._extract_citations(content, documents)
            
            # Calculate confidence score
            confidence = self._calculate_confidence(content, documents)
            
            # Suggest related concepts
            related_concepts = await self._suggest_related_concepts(message, documents)
            
            return {
                "content": content,
                "citations": citations,
                "confidence": confidence,
                "related_concepts": related_concepts,
                "mode": "scholar",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Error in Scholar mode chat: {str(e)}")
    
    async def _explorer_mode_chat(self, message: str, context: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Explorer mode: Creative synthesis and idea generation"""
        
        documents = context.get("documents", [])
        conversation_history = context.get("conversation_history", [])
        
        # Build context
        document_context = ""
        if documents:
            document_context = "\n\n".join([
                f"Document: {doc.get('title', 'Untitled')}\nContent: {doc.get('content', '')[:800]}..."
                for doc in documents[:7]  # More documents for creative synthesis
            ])
        
        history_context = ""
        if conversation_history:
            history_context = "\n".join([
                f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
                for msg in conversation_history[-8:]  # More history for context
            ])
        
        system_prompt = f"""You are a creative AI assistant in Explorer Mode. Your role is to help users explore ideas, make creative connections, and generate innovative insights.

IMPORTANT GUIDELINES:
1. Think creatively and make novel connections between concepts
2. Draw from multiple disciplines and perspectives
3. Generate hypotheses and thought experiments
4. Encourage exploration of "what if" scenarios
5. Suggest unconventional approaches and solutions
6. Make interdisciplinary connections
7. Inspire curiosity and deeper thinking

Available Knowledge Base:
{document_context}

Previous Conversation:
{history_context}

Current time: {datetime.now().isoformat()}"""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.8,  # Higher temperature for creativity
                max_tokens=1500
            )
            
            content = response.choices[0].message.content
            
            # Generate creative suggestions
            suggested_actions = await self._generate_creative_actions(message, content)
            
            # Find interdisciplinary connections
            connections = await self._find_interdisciplinary_connections(message, documents)
            
            return {
                "content": content,
                "suggested_actions": suggested_actions,
                "interdisciplinary_connections": connections,
                "mode": "explorer",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Error in Explorer mode chat: {str(e)}")
    
    async def generate_memory_cards(self, content: str, user_id: str) -> List[Dict[str, Any]]:
        """Generate memory cards from content"""
        
        system_prompt = """You are an expert at creating effective memory cards for spaced repetition learning. 

Create memory cards that:
1. Focus on key concepts and facts
2. Use clear, concise questions
3. Have specific, accurate answers
4. Follow best practices for memory retention
5. Include different types of questions (factual, conceptual, application)

Return a JSON array of memory cards with 'front' and 'back' fields."""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Create memory cards from this content:\n\n{content[:2000]}"}
                ],
                temperature=0.4,
                max_tokens=1000
            )
            
            content_response = response.choices[0].message.content
            
            # Try to parse JSON response
            try:
                cards = json.loads(content_response)
                if isinstance(cards, list):
                    return cards
            except json.JSONDecodeError:
                pass
            
            # Fallback: extract cards from text response
            return self._extract_cards_from_text(content_response)
            
        except Exception as e:
            raise Exception(f"Error generating memory cards: {str(e)}")
    
    async def generate_connections(self, nodes: List[Dict[str, Any]], user_id: str) -> List[Dict[str, Any]]:
        """Generate suggested connections between nodes"""
        
        if len(nodes) < 2:
            return []
        
        node_descriptions = []
        for node in nodes:
            desc = f"ID: {node.get('id')}, Title: {node.get('title')}, Type: {node.get('type')}, Content: {node.get('content', '')[:200]}"
            node_descriptions.append(desc)
        
        system_prompt = """You are an expert at identifying meaningful relationships between concepts and ideas.

Analyze the provided nodes and suggest logical connections between them. Consider:
1. Conceptual relationships (cause-effect, part-whole, similarity, etc.)
2. Temporal relationships (sequence, precedence)
3. Hierarchical relationships (parent-child, category-instance)
4. Functional relationships (tool-purpose, method-goal)

Return suggestions as JSON array with: source_id, target_id, relationship_type, label, strength (0-1), reasoning."""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Suggest connections between these nodes:\n\n{chr(10).join(node_descriptions)}"}
                ],
                temperature=0.5,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content
            
            try:
                connections = json.loads(content)
                if isinstance(connections, list):
                    return connections
            except json.JSONDecodeError:
                pass
            
            return []
            
        except Exception as e:
            raise Exception(f"Error generating connections: {str(e)}")
    
    async def generate_nodes(self, content: str, title: str, user_id: str) -> List[Dict[str, Any]]:
        """Generate nodes from document content"""
        
        system_prompt = """You are an expert at extracting key concepts and creating knowledge nodes from content.

Analyze the content and create nodes for:
1. Main concepts and ideas
2. Key facts and data points
3. Important processes or methods
4. Notable people, places, or entities
5. Actionable insights

Return JSON array with: type (concept/article/project/etc), title, content, metadata."""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Title: {title}\n\nContent: {content[:3000]}"}
                ],
                temperature=0.4,
                max_tokens=1200
            )
            
            content_response = response.choices[0].message.content
            
            try:
                nodes = json.loads(content_response)
                if isinstance(nodes, list):
                    return nodes
            except json.JSONDecodeError:
                pass
            
            return []
            
        except Exception as e:
            raise Exception(f"Error generating nodes: {str(e)}")
    
    async def generate_citations(self, response_text: str, documents: List[Dict[str, Any]], user_id: str) -> List[Dict[str, Any]]:
        """Generate citations for AI response"""
        
        citations = []
        
        for doc in documents:
            doc_content = doc.get('content', '').lower()
            response_lower = response_text.lower()
            
            # Simple keyword matching for citations
            # In production, use more sophisticated semantic matching
            doc_words = set(doc_content.split())
            response_words = set(response_lower.split())
            
            overlap = len(doc_words.intersection(response_words))
            if overlap > 10:  # Threshold for citation
                citations.append({
                    "document_id": doc.get('id'),
                    "title": doc.get('title'),
                    "excerpt": doc_content[:200] + "...",
                    "confidence": min(overlap / 50.0, 1.0),
                    "relevance_score": overlap
                })
        
        # Sort by relevance and return top citations
        citations.sort(key=lambda x: x['relevance_score'], reverse=True)
        return citations[:5]
    
    def _calculate_confidence(self, response: str, documents: List[Dict[str, Any]]) -> float:
        """Calculate confidence score for response"""
        if not documents:
            return 0.3  # Low confidence without source documents
        
        # Simple heuristic based on response length and document availability
        base_confidence = 0.7 if len(documents) > 0 else 0.3
        length_factor = min(len(response) / 500, 1.0)  # Longer responses might be more confident
        
        return min(base_confidence + (length_factor * 0.2), 0.95)
    
    async def _suggest_related_concepts(self, query: str, documents: List[Dict[str, Any]]) -> List[str]:
        """Suggest related concepts"""
        # Simple keyword extraction for related concepts
        # In production, use more sophisticated NLP
        
        concepts = []
        for doc in documents[:3]:
            content = doc.get('content', '').lower()
            words = content.split()
            
            # Extract potential concepts (capitalized words, technical terms)
            for word in words:
                if len(word) > 5 and word.isalpha():
                    concepts.append(word.title())
        
        # Return unique concepts
        return list(set(concepts))[:8]
    
    async def _generate_creative_actions(self, query: str, response: str) -> List[str]:
        """Generate creative action suggestions"""
        
        actions = [
            "Explore this concept from a different cultural perspective",
            "Consider the opposite viewpoint or inverse relationship",
            "Apply this idea to a completely different domain",
            "Create a visual representation or diagram",
            "Design an experiment to test this hypothesis",
            "Find historical parallels or precedents",
            "Imagine future implications or developments",
            "Connect this to current events or trends"
        ]
        
        return actions[:4]  # Return subset of actions
    
    async def _find_interdisciplinary_connections(self, query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Find connections across disciplines"""
        
        disciplines = ["Science", "Technology", "Philosophy", "Psychology", "History", "Art", "Economics", "Sociology"]
        connections = []
        
        for discipline in disciplines[:3]:
            connections.append({
                "discipline": discipline,
                "connection": f"This concept relates to {discipline} through shared principles of systems thinking and pattern recognition."
            })
        
        return connections
    
    def _extract_cards_from_text(self, text: str) -> List[Dict[str, str]]:
        """Extract memory cards from text response"""
        cards = []
        lines = text.split('\n')
        
        current_front = ""
        current_back = ""
        
        for line in lines:
            line = line.strip()
            if line.startswith('Q:') or line.startswith('Front:'):
                current_front = line.split(':', 1)[1].strip()
            elif line.startswith('A:') or line.startswith('Back:'):
                current_back = line.split(':', 1)[1].strip()
                if current_front and current_back:
                    cards.append({
                        "front": current_front,
                        "back": current_back
                    })
                    current_front = ""
                    current_back = ""
        
        return cards
    
    async def _extract_citations(self, response: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract citations from response"""
        return await self.generate_citations(response, documents, "")