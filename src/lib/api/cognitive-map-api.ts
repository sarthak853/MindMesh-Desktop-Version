'use client'

import { CognitiveNode, NodeConnection } from '@/types'

export class CognitiveMapAPI {
  private baseUrl = '/api/cognitive-maps'

  // Node management
  async createNode(mapId: string, nodeData: Partial<CognitiveNode>): Promise<CognitiveNode> {
    const response = await fetch(`${this.baseUrl}/${mapId}/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: nodeData.type,
        title: nodeData.title,
        content: nodeData.content,
        positionX: nodeData.position?.x || 0,
        positionY: nodeData.position?.y || 0,
        metadata: nodeData.metadata || {},
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create node')
    }

    const result = await response.json()
    return {
      ...result.node,
      position: { x: result.node.positionX, y: result.node.positionY }
    }
  }

  async updateNode(mapId: string, nodeId: string, updates: Partial<CognitiveNode>): Promise<CognitiveNode> {
    const response = await fetch(`${this.baseUrl}/${mapId}/nodes/${nodeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: updates.type,
        title: updates.title,
        content: updates.content,
        positionX: updates.position?.x,
        positionY: updates.position?.y,
        metadata: updates.metadata,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update node')
    }

    const result = await response.json()
    return {
      ...result.node,
      position: { x: result.node.positionX, y: result.node.positionY }
    }
  }

  async deleteNode(mapId: string, nodeId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${mapId}/nodes/${nodeId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete node')
    }
  }

  // Connection management
  async createConnection(mapId: string, connectionData: Partial<NodeConnection>): Promise<NodeConnection> {
    const response = await fetch(`${this.baseUrl}/${mapId}/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceNodeId: connectionData.sourceNodeId,
        targetNodeId: connectionData.targetNodeId,
        relationshipType: connectionData.relationshipType || 'related',
        label: connectionData.label,
        strength: connectionData.strength || 1.0,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create connection')
    }

    const result = await response.json()
    return result.connection
  }

  async updateConnection(mapId: string, connectionId: string, updates: Partial<NodeConnection>): Promise<NodeConnection> {
    const response = await fetch(`${this.baseUrl}/${mapId}/connections/${connectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        relationshipType: updates.relationshipType,
        label: updates.label,
        strength: updates.strength,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update connection')
    }

    const result = await response.json()
    return result.connection
  }

  async deleteConnection(mapId: string, connectionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${mapId}/connections/${connectionId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete connection')
    }
  }

  // Map management
  async getCognitiveMap(mapId: string) {
    const response = await fetch(`${this.baseUrl}/${mapId}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to fetch cognitive map (status ${response.status})`)
    }

    const result = await response.json()
    return {
      ...result.map,
      nodes: result.map.nodes.map((node: any) => ({
        ...node,
        position: { x: node.positionX, y: node.positionY }
      }))
    }
  }

  async getUserMaps() {
    // Ensure we're in the browser
    if (typeof window === 'undefined') {
      console.log('getUserMaps called on server, returning empty array')
      return []
    }

    try {
      const url = this.baseUrl
      console.log('Fetching cognitive maps from:', url)
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        console.log('Response status:', response.status)

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          console.error('Failed to fetch cognitive maps:', error)
          
          // If unauthorized, return empty array instead of throwing
          if (response.status === 401) {
            console.log('User not authenticated, returning empty array')
            return []
          }
          
          console.warn(`API returned ${response.status}, returning empty array`)
          return []
        }

        const result = await response.json()
        console.log('Fetched maps:', result.maps)
        return result.maps || []
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            console.warn('Cognitive maps request timeout after 10 seconds')
          } else {
            // Only log if it's not a network error (which is expected when offline)
            if (!fetchError.message.includes('fetch')) {
              console.warn('Cognitive maps fetch error:', fetchError.message)
            }
          }
        }
        
        // Return empty array on any fetch error (this is expected behavior)
        return []
      }
    } catch (error) {
      console.error('Error in getUserMaps:', error)
      // Return empty array instead of throwing to prevent crashes
      return []
    }
  }

  // Create a new cognitive map
  async createMap(title: string, description?: string, isPublic: boolean = false) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, isPublic })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to create cognitive map')
    }

    const result = await response.json()
    return result.map
  }
}

export const cognitiveMapAPI = new CognitiveMapAPI()