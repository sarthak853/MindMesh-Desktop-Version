from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import os
from dotenv import load_dotenv

from services.ai_service import AIService
from services.document_service import DocumentService
from services.embedding_service import EmbeddingService
from services.memory_service import MemoryService

load_dotenv()

app = FastAPI(title="MindMesh AI Services", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://mindmesh.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize services
ai_service = AIService()
document_service = DocumentService()
embedding_service = EmbeddingService()
memory_service = MemoryService()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token from Next.js app"""
    # In production, verify the JWT token here
    # For now, we'll just check if token exists
    if not credentials.credentials:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return credentials.credentials

@app.get("/")
async def root():
    return {"message": "MindMesh AI Services", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "services": ["ai", "document", "embedding", "memory"]}

# AI Chat Endpoints
@app.post("/ai/chat")
async def chat_with_ai(
    request: dict,
    token: str = Depends(verify_token)
):
    """Chat with AI in Scholar or Explorer mode"""
    try:
        mode = request.get("mode", "scholar")
        message = request.get("message", "")
        context = request.get("context", {})
        user_id = request.get("user_id", "")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        response = await ai_service.chat(
            message=message,
            mode=mode,
            context=context,
            user_id=user_id
        )
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/generate-memory-cards")
async def generate_memory_cards(
    request: dict,
    token: str = Depends(verify_token)
):
    """Generate memory cards from content"""
    try:
        content = request.get("content", "")
        user_id = request.get("user_id", "")
        
        if not content:
            raise HTTPException(status_code=400, detail="Content is required")
        
        cards = await ai_service.generate_memory_cards(content, user_id)
        return {"cards": cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/generate-connections")
async def generate_connections(
    request: dict,
    token: str = Depends(verify_token)
):
    """Generate suggested connections between nodes"""
    try:
        nodes = request.get("nodes", [])
        user_id = request.get("user_id", "")
        
        if not nodes:
            raise HTTPException(status_code=400, detail="Nodes are required")
        
        connections = await ai_service.generate_connections(nodes, user_id)
        return {"connections": connections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/generate-nodes")
async def generate_nodes_from_content(
    request: dict,
    token: str = Depends(verify_token)
):
    """Generate nodes from document content"""
    try:
        content = request.get("content", "")
        title = request.get("title", "")
        user_id = request.get("user_id", "")
        
        if not content:
            raise HTTPException(status_code=400, detail="Content is required")
        
        nodes = await ai_service.generate_nodes(content, title, user_id)
        return {"nodes": nodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/citations")
async def get_citations(
    request: dict,
    token: str = Depends(verify_token)
):
    """Get citations for AI response"""
    try:
        response_text = request.get("response", "")
        documents = request.get("documents", [])
        user_id = request.get("user_id", "")
        
        citations = await ai_service.generate_citations(response_text, documents, user_id)
        return {"citations": citations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Document Processing Endpoints
@app.post("/documents/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    token: str = Depends(verify_token)
):
    """Analyze uploaded document"""
    try:
        content = await document_service.extract_content(file)
        analysis = await document_service.analyze_content(content)
        
        return {
            "content": content,
            "analysis": analysis,
            "metadata": {
                "filename": file.filename,
                "content_type": file.content_type,
                "size": file.size
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/search")
async def search_documents(
    request: dict,
    token: str = Depends(verify_token)
):
    """Search documents using semantic similarity"""
    try:
        query = request.get("query", "")
        user_id = request.get("user_id", "")
        limit = request.get("limit", 10)
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        results = await document_service.search_documents(query, user_id, limit)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Embedding Endpoints
@app.post("/embeddings/generate")
async def generate_embeddings(
    request: dict,
    token: str = Depends(verify_token)
):
    """Generate embeddings for text"""
    try:
        texts = request.get("texts", [])
        
        if not texts:
            raise HTTPException(status_code=400, detail="Texts are required")
        
        embeddings = await embedding_service.generate_embeddings(texts)
        return {"embeddings": embeddings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embeddings/similarity")
async def calculate_similarity(
    request: dict,
    token: str = Depends(verify_token)
):
    """Calculate similarity between texts"""
    try:
        text1 = request.get("text1", "")
        text2 = request.get("text2", "")
        
        if not text1 or not text2:
            raise HTTPException(status_code=400, detail="Both texts are required")
        
        similarity = await embedding_service.calculate_similarity(text1, text2)
        return {"similarity": similarity}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Memory/Spaced Repetition Endpoints
@app.post("/memory/schedule")
async def schedule_review(
    request: dict,
    token: str = Depends(verify_token)
):
    """Calculate next review date for memory card"""
    try:
        card_data = request.get("card", {})
        performance = request.get("performance", 0)
        
        next_review = memory_service.calculate_next_review(card_data, performance)
        return {"next_review": next_review}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/memory/due-cards/{user_id}")
async def get_due_cards(
    user_id: str,
    token: str = Depends(verify_token)
):
    """Get due memory cards for user"""
    try:
        due_cards = await memory_service.get_due_cards(user_id)
        return {"cards": due_cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )