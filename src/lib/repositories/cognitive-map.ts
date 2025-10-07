import { BaseRepository } from './base'

interface CognitiveMap {
  id: string
  userId: string
  title: string
  description?: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

interface CognitiveNode {
  id: string
  mapId: string
  type: string
  title: string
  content?: string
  positionX: number
  positionY: number
  metadata: any
  createdAt: Date
  updatedAt: Date
}

interface NodeConnection {
  id: string
  sourceNodeId: string
  targetNodeId: string
  relationshipType?: string
  label?: string
  strength: number
  createdAt: Date
}

type CognitiveMapWithRelations = CognitiveMap & {
  nodes: CognitiveNode[]
  connections: NodeConnection[]
}

export class CognitiveMapRepository extends BaseRepository<CognitiveMapWithRelations> {
  async create(data: Partial<CognitiveMap>): Promise<CognitiveMapWithRelations> {
    try {
      // Fallback to in-memory store when Electron DB is not available
      if (!this.isElectronAvailable()) {
        const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
        const now = new Date()

        const map: CognitiveMap = {
          id,
          userId: String(data.userId),
          title: String(data.title || ''),
          description: data.description || undefined,
          isPublic: Boolean(data.isPublic || false),
          createdAt: now,
          updatedAt: now,
        }
        InMemoryStore.maps.set(id, map)
        InMemoryStore.mapNodes.set(id, [])
        InMemoryStore.mapConnections.set(id, [])
        return { ...map, nodes: [], connections: [] }
      }
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await this.executeCommand(
        `INSERT INTO cognitive_maps (id, user_id, title, description, is_public, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.userId,
          data.title,
          data.description || null,
          data.isPublic ? 1 : 0,
          now,
          now
        ]
      )
      
      return this.findById(id) as Promise<CognitiveMapWithRelations>
    } catch (error) {
      this.handleError(error, 'create cognitive map')
    }
  }

  async findById(id: string): Promise<CognitiveMapWithRelations | null> {
    try {
      // In-memory fallback
      if (!this.isElectronAvailable()) {
        const map = InMemoryStore.maps.get(id)
        if (!map) return null
        const nodes = InMemoryStore.mapNodes.get(id) || []
        const connections = InMemoryStore.mapConnections.get(id) || []
        return { ...map, nodes, connections }
      }
      const mapResult = await this.executeQuery(
        'SELECT * FROM cognitive_maps WHERE id = ?',
        [id]
      )
      
      if (!mapResult || mapResult.length === 0) return null
      
      const map = this.mapRowToCognitiveMap(mapResult[0])
      
      // Get nodes
      const nodesResult = await this.executeQuery(
        'SELECT * FROM cognitive_nodes WHERE map_id = ?',
        [id]
      )
      const nodes = nodesResult.map((row: any) => this.mapRowToCognitiveNode(row))
      
      // Get connections
      const connectionsResult = await this.executeQuery(
        'SELECT * FROM node_connections WHERE source_node_id IN (SELECT id FROM cognitive_nodes WHERE map_id = ?)',
        [id]
      )
      const connections = connectionsResult.map((row: any) => this.mapRowToNodeConnection(row))
      
      return {
        ...map,
        nodes,
        connections
      }
    } catch (error) {
      this.handleError(error, 'find cognitive map by id')
    }
  }

  async findMany(where?: any): Promise<CognitiveMapWithRelations[]> {
    try {
      // In-memory fallback
      if (!this.isElectronAvailable()) {
        const maps: CognitiveMapWithRelations[] = []
        for (const [id, map] of InMemoryStore.maps.entries()) {
          const nodes = InMemoryStore.mapNodes.get(id) || []
          const connections = InMemoryStore.mapConnections.get(id) || []
          maps.push({ ...map, nodes, connections })
        }
        // Sort by updatedAt DESC
        maps.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        return maps
      }
      const result = await this.executeQuery(
        'SELECT * FROM cognitive_maps ORDER BY updated_at DESC'
      )
      
      const maps: CognitiveMapWithRelations[] = []
      for (const row of result) {
        const map = await this.findById(row.id)
        if (map) maps.push(map)
      }
      
      return maps
    } catch (error) {
      this.handleError(error, 'find many cognitive maps')
    }
  }

  async findByUserId(userId: string): Promise<CognitiveMapWithRelations[]> {
    try {
      // In-memory fallback
      if (!this.isElectronAvailable()) {
        const maps: CognitiveMapWithRelations[] = []
        for (const [id, map] of InMemoryStore.maps.entries()) {
          if (map.userId === userId) {
            const nodes = InMemoryStore.mapNodes.get(id) || []
            const connections = InMemoryStore.mapConnections.get(id) || []
            maps.push({ ...map, nodes, connections })
          }
        }
        maps.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        return maps
      }
      const result = await this.executeQuery(
        'SELECT * FROM cognitive_maps WHERE user_id = ? ORDER BY updated_at DESC',
        [userId]
      )
      
      const maps: CognitiveMapWithRelations[] = []
      for (const row of result) {
        const map = await this.findById(row.id)
        if (map) maps.push(map)
      }
      
      return maps
    } catch (error) {
      this.handleError(error, 'find cognitive maps by user id')
    }
  }

  async update(id: string, data: Partial<CognitiveMap>): Promise<CognitiveMapWithRelations> {
    try {
      const updates: string[] = []
      const params: any[] = []
      
      if (data.title !== undefined) {
        updates.push('title = ?')
        params.push(data.title)
      }
      if (data.description !== undefined) {
        updates.push('description = ?')
        params.push(data.description)
      }
      if (data.isPublic !== undefined) {
        updates.push('is_public = ?')
        params.push(data.isPublic ? 1 : 0)
      }
      
      updates.push('updated_at = ?')
      params.push(new Date().toISOString())
      params.push(id)
      
      await this.executeCommand(
        `UPDATE cognitive_maps SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
      
      return this.findById(id) as Promise<CognitiveMapWithRelations>
    } catch (error) {
      this.handleError(error, 'update cognitive map')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Delete connections first (foreign key constraints)
      await this.executeCommand(
        'DELETE FROM node_connections WHERE source_node_id IN (SELECT id FROM cognitive_nodes WHERE map_id = ?)',
        [id]
      )
      
      // Delete nodes
      await this.executeCommand('DELETE FROM cognitive_nodes WHERE map_id = ?', [id])
      
      // Delete map
      await this.executeCommand('DELETE FROM cognitive_maps WHERE id = ?', [id])
    } catch (error) {
      this.handleError(error, 'delete cognitive map')
    }
  }

  async addNode(mapId: string, nodeData: Partial<CognitiveNode>): Promise<CognitiveNode> {
    try {
      // In-memory fallback
      if (!this.isElectronAvailable()) {
        const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
        const now = new Date()
        const node: CognitiveNode = {
          id,
          mapId,
          type: String(nodeData.type || 'concept'),
          title: String(nodeData.title || 'Concept'),
          content: nodeData.content || undefined,
          positionX: Number(nodeData.positionX || 0),
          positionY: Number(nodeData.positionY || 0),
          metadata: nodeData.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        }
        const nodes = InMemoryStore.mapNodes.get(mapId) || []
        nodes.push(node)
        InMemoryStore.mapNodes.set(mapId, nodes)
        // touch map updatedAt
        const map = InMemoryStore.maps.get(mapId)
        if (map) {
          map.updatedAt = new Date()
          InMemoryStore.maps.set(mapId, map)
        }
        return node
      }
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await this.executeCommand(
        `INSERT INTO cognitive_nodes (id, map_id, type, title, content, position_x, position_y, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          mapId,
          nodeData.type,
          nodeData.title,
          nodeData.content || null,
          nodeData.positionX,
          nodeData.positionY,
          JSON.stringify(nodeData.metadata || {}),
          now,
          now
        ]
      )
      
      const result = await this.executeQuery(
        'SELECT * FROM cognitive_nodes WHERE id = ?',
        [id]
      )
      
      return this.mapRowToCognitiveNode(result[0])
    } catch (error) {
      this.handleError(error, 'add node to cognitive map')
    }
  }

  async updateNode(nodeId: string, nodeData: Partial<CognitiveNode>): Promise<CognitiveNode> {
    try {
      const updates: string[] = []
      const params: any[] = []
      
      if (nodeData.type !== undefined) {
        updates.push('type = ?')
        params.push(nodeData.type)
      }
      if (nodeData.title !== undefined) {
        updates.push('title = ?')
        params.push(nodeData.title)
      }
      if (nodeData.content !== undefined) {
        updates.push('content = ?')
        params.push(nodeData.content)
      }
      if (nodeData.positionX !== undefined) {
        updates.push('position_x = ?')
        params.push(nodeData.positionX)
      }
      if (nodeData.positionY !== undefined) {
        updates.push('position_y = ?')
        params.push(nodeData.positionY)
      }
      if (nodeData.metadata !== undefined) {
        updates.push('metadata = ?')
        params.push(JSON.stringify(nodeData.metadata))
      }
      
      updates.push('updated_at = ?')
      params.push(new Date().toISOString())
      params.push(nodeId)
      
      await this.executeCommand(
        `UPDATE cognitive_nodes SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
      
      const result = await this.executeQuery(
        'SELECT * FROM cognitive_nodes WHERE id = ?',
        [nodeId]
      )
      
      return this.mapRowToCognitiveNode(result[0])
    } catch (error) {
      this.handleError(error, 'update cognitive node')
    }
  }

  async deleteNode(nodeId: string): Promise<void> {
    try {
      // Delete connections first
      await this.executeCommand(
        'DELETE FROM node_connections WHERE source_node_id = ? OR target_node_id = ?',
        [nodeId, nodeId]
      )
      
      // Delete node
      await this.executeCommand('DELETE FROM cognitive_nodes WHERE id = ?', [nodeId])
    } catch (error) {
      this.handleError(error, 'delete cognitive node')
    }
  }

  async addConnection(connectionData: Partial<NodeConnection>): Promise<NodeConnection> {
    try {
      // In-memory fallback
      if (!this.isElectronAvailable()) {
        const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
        const now = new Date()
        const sourceNodeId = String(connectionData.sourceNodeId)
        const targetNodeId = String(connectionData.targetNodeId)
        // Determine mapId by checking which map contains both nodes
        let mapId: string | null = null
        for (const [mId, nodes] of InMemoryStore.mapNodes.entries()) {
          const hasSource = nodes.some(n => n.id === sourceNodeId)
          const hasTarget = nodes.some(n => n.id === targetNodeId)
          if (hasSource && hasTarget) {
            mapId = mId
            break
          }
        }
        const conn: NodeConnection = {
          id,
          sourceNodeId,
          targetNodeId,
          relationshipType: connectionData.relationshipType,
          label: connectionData.label,
          strength: Number(connectionData.strength || 1.0),
          createdAt: now,
        }
        if (mapId) {
          const list = InMemoryStore.mapConnections.get(mapId) || []
          list.push(conn)
          InMemoryStore.mapConnections.set(mapId, list)
        }
        return conn
      }
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await this.executeCommand(
        `INSERT INTO node_connections (id, source_node_id, target_node_id, relationship_type, label, strength, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          connectionData.sourceNodeId,
          connectionData.targetNodeId,
          connectionData.relationshipType || null,
          connectionData.label || null,
          connectionData.strength || 1.0,
          now
        ]
      )
      
      const result = await this.executeQuery(
        'SELECT * FROM node_connections WHERE id = ?',
        [id]
      )
      
      return this.mapRowToNodeConnection(result[0])
    } catch (error) {
      this.handleError(error, 'add connection to cognitive map')
    }
  }

  async updateConnection(connectionId: string, connectionData: Partial<NodeConnection>): Promise<NodeConnection> {
    try {
      const updates: string[] = []
      const params: any[] = []
      
      if (connectionData.relationshipType !== undefined) {
        updates.push('relationship_type = ?')
        params.push(connectionData.relationshipType)
      }
      if (connectionData.label !== undefined) {
        updates.push('label = ?')
        params.push(connectionData.label)
      }
      if (connectionData.strength !== undefined) {
        updates.push('strength = ?')
        params.push(connectionData.strength)
      }
      
      params.push(connectionId)
      
      await this.executeCommand(
        `UPDATE node_connections SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
      
      const result = await this.executeQuery(
        'SELECT * FROM node_connections WHERE id = ?',
        [connectionId]
      )
      
      return this.mapRowToNodeConnection(result[0])
    } catch (error) {
      this.handleError(error, 'update node connection')
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    try {
      await this.executeCommand('DELETE FROM node_connections WHERE id = ?', [connectionId])
    } catch (error) {
      this.handleError(error, 'delete node connection')
    }
  }

  private mapRowToCognitiveMap(row: any): CognitiveMap {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      isPublic: Boolean(row.is_public),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  private mapRowToCognitiveNode(row: any): CognitiveNode {
    return {
      id: row.id,
      mapId: row.map_id,
      type: row.type,
      title: row.title,
      content: row.content,
      positionX: row.position_x,
      positionY: row.position_y,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  private mapRowToNodeConnection(row: any): NodeConnection {
    return {
      id: row.id,
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      relationshipType: row.relationship_type,
      label: row.label,
      strength: row.strength,
      createdAt: new Date(row.created_at)
    }
  }
}

// In-memory store used in web/SSR where Electron DB is not available
const InMemoryStore = {
  maps: new Map<string, CognitiveMap>(),
  mapNodes: new Map<string, CognitiveNode[]>(),
  mapConnections: new Map<string, NodeConnection[]>(),
}