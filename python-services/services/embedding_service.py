import asyncio
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
import redis
import json
import hashlib
import logging
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
import pickle

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.embedding_dim = 384  # Dimension of all-MiniLM-L6-v2
        self.cache_ttl = 86400  # 24 hours
        
    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for text"""
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"embedding:{text_hash}"
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        try:
            # Check cache first
            cache_key = self._get_cache_key(text)
            cached_embedding = self.redis_client.get(cache_key)
            
            if cached_embedding:
                return json.loads(cached_embedding)
            
            # Generate new embedding
            embedding = self.model.encode(text, convert_to_tensor=False)
            embedding_list = embedding.tolist()
            
            # Cache the result
            self.redis_client.setex(
                cache_key, 
                self.cache_ttl, 
                json.dumps(embedding_list)
            )
            
            return embedding_list
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts efficiently"""
        try:
            embeddings = []
            uncached_texts = []
            uncached_indices = []
            
            # Check cache for each text
            for i, text in enumerate(texts):
                cache_key = self._get_cache_key(text)
                cached_embedding = self.redis_client.get(cache_key)
                
                if cached_embedding:
                    embeddings.append(json.loads(cached_embedding))
                else:
                    embeddings.append(None)
                    uncached_texts.append(text)
                    uncached_indices.append(i)
            
            # Generate embeddings for uncached texts
            if uncached_texts:
                new_embeddings = self.model.encode(uncached_texts, convert_to_tensor=False)
                
                # Cache and insert new embeddings
                for idx, embedding in zip(uncached_indices, new_embeddings):
                    embedding_list = embedding.tolist()
                    embeddings[idx] = embedding_list
                    
                    # Cache the result
                    cache_key = self._get_cache_key(texts[idx])
                    self.redis_client.setex(
                        cache_key,
                        self.cache_ttl,
                        json.dumps(embedding_list)
                    )
            
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {str(e)}")
            raise
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            vec1 = np.array(embedding1).reshape(1, -1)
            vec2 = np.array(embedding2).reshape(1, -1)
            
            similarity = cosine_similarity(vec1, vec2)[0][0]
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            return 0.0
    
    def find_similar_embeddings(self, 
                               query_embedding: List[float], 
                               candidate_embeddings: List[List[float]], 
                               top_k: int = 10,
                               threshold: float = 0.5) -> List[Tuple[int, float]]:
        """Find most similar embeddings to query"""
        try:
            query_vec = np.array(query_embedding).reshape(1, -1)
            candidate_vecs = np.array(candidate_embeddings)
            
            # Calculate similarities
            similarities = cosine_similarity(query_vec, candidate_vecs)[0]
            
            # Filter by threshold and get top-k
            valid_indices = np.where(similarities >= threshold)[0]
            valid_similarities = similarities[valid_indices]
            
            # Sort by similarity (descending)
            sorted_indices = np.argsort(valid_similarities)[::-1][:top_k]
            
            results = [
                (int(valid_indices[idx]), float(valid_similarities[idx]))
                for idx in sorted_indices
            ]
            
            return results
            
        except Exception as e:
            logger.error(f"Error finding similar embeddings: {str(e)}")
            return []
    
    def cluster_embeddings(self, 
                          embeddings: List[List[float]], 
                          n_clusters: int = 5) -> Dict[str, Any]:
        """Cluster embeddings using K-means"""
        try:
            if len(embeddings) < n_clusters:
                n_clusters = len(embeddings)
            
            embedding_matrix = np.array(embeddings)
            
            # Perform K-means clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(embedding_matrix)
            
            # Calculate cluster centers
            cluster_centers = kmeans.cluster_centers_.tolist()
            
            # Group embeddings by cluster
            clusters = {}
            for i, label in enumerate(cluster_labels):
                if label not in clusters:
                    clusters[label] = []
                clusters[label].append(i)
            
            # Calculate inertia (within-cluster sum of squares)
            inertia = float(kmeans.inertia_)
            
            return {
                'cluster_labels': cluster_labels.tolist(),
                'cluster_centers': cluster_centers,
                'clusters': clusters,
                'n_clusters': n_clusters,
                'inertia': inertia
            }
            
        except Exception as e:
            logger.error(f"Error clustering embeddings: {str(e)}")
            return {
                'cluster_labels': [0] * len(embeddings),
                'cluster_centers': [],
                'clusters': {0: list(range(len(embeddings)))},
                'n_clusters': 1,
                'inertia': 0.0
            }
    
    def reduce_dimensionality(self, 
                            embeddings: List[List[float]], 
                            n_components: int = 2) -> List[List[float]]:
        """Reduce embedding dimensionality for visualization"""
        try:
            from sklearn.decomposition import PCA
            
            embedding_matrix = np.array(embeddings)
            
            # Apply PCA
            pca = PCA(n_components=n_components)
            reduced_embeddings = pca.fit_transform(embedding_matrix)
            
            return reduced_embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Error reducing dimensionality: {str(e)}")
            # Return random 2D points as fallback
            return [[float(np.random.randn()), float(np.random.randn())] 
                   for _ in range(len(embeddings))]
    
    def semantic_search(self, 
                       query: str, 
                       documents: List[Dict[str, Any]], 
                       top_k: int = 10) -> List[Dict[str, Any]]:
        """Perform semantic search on documents"""
        try:
            # Generate query embedding
            query_embedding = asyncio.run(self.generate_embedding(query))
            
            # Extract document embeddings
            doc_embeddings = []
            valid_docs = []
            
            for doc in documents:
                if 'embedding' in doc and doc['embedding']:
                    doc_embeddings.append(doc['embedding'])
                    valid_docs.append(doc)
            
            if not doc_embeddings:
                return []
            
            # Find similar documents
            similar_indices = self.find_similar_embeddings(
                query_embedding, 
                doc_embeddings, 
                top_k=top_k
            )
            
            # Return ranked results
            results = []
            for idx, similarity in similar_indices:
                doc = valid_docs[idx].copy()
                doc['similarity_score'] = similarity
                results.append(doc)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in semantic search: {str(e)}")
            return []
    
    def get_embedding_stats(self, embeddings: List[List[float]]) -> Dict[str, Any]:
        """Calculate statistics for embeddings"""
        try:
            if not embeddings:
                return {}
            
            embedding_matrix = np.array(embeddings)
            
            stats = {
                'count': len(embeddings),
                'dimension': len(embeddings[0]),
                'mean_norm': float(np.mean(np.linalg.norm(embedding_matrix, axis=1))),
                'std_norm': float(np.std(np.linalg.norm(embedding_matrix, axis=1))),
                'mean_values': np.mean(embedding_matrix, axis=0).tolist(),
                'std_values': np.std(embedding_matrix, axis=0).tolist()
            }
            
            # Calculate pairwise similarities
            similarities = cosine_similarity(embedding_matrix)
            
            # Remove diagonal (self-similarities)
            mask = np.ones(similarities.shape, dtype=bool)
            np.fill_diagonal(mask, False)
            off_diagonal_similarities = similarities[mask]
            
            stats.update({
                'mean_similarity': float(np.mean(off_diagonal_similarities)),
                'std_similarity': float(np.std(off_diagonal_similarities)),
                'min_similarity': float(np.min(off_diagonal_similarities)),
                'max_similarity': float(np.max(off_diagonal_similarities))
            })
            
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating embedding stats: {str(e)}")
            return {}
    
    def save_embeddings(self, embeddings: List[List[float]], filepath: str):
        """Save embeddings to file"""
        try:
            with open(filepath, 'wb') as f:
                pickle.dump(embeddings, f)
            logger.info(f"Saved {len(embeddings)} embeddings to {filepath}")
        except Exception as e:
            logger.error(f"Error saving embeddings: {str(e)}")
            raise
    
    def load_embeddings(self, filepath: str) -> List[List[float]]:
        """Load embeddings from file"""
        try:
            with open(filepath, 'rb') as f:
                embeddings = pickle.load(f)
            logger.info(f"Loaded {len(embeddings)} embeddings from {filepath}")
            return embeddings
        except Exception as e:
            logger.error(f"Error loading embeddings: {str(e)}")
            raise
    
    def clear_cache(self, pattern: str = "embedding:*"):
        """Clear embedding cache"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Cleared {len(keys)} cached embeddings")
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            embedding_keys = self.redis_client.keys("embedding:*")
            
            stats = {
                'cached_embeddings': len(embedding_keys),
                'cache_memory_usage': self.redis_client.memory_usage(),
                'cache_ttl': self.cache_ttl
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {}