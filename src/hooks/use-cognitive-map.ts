'use client'

import { useState, useEffect, useCallback } from 'react'
import { CognitiveNode, NodeConnection } from '@/types'
import { cognitiveMapAPI } from '@/lib/api/cognitive-map-api'
import { toast } from 'sonner'

interface UseCognitiveMapProps {
  mapId?: string
  initialNodes?: CognitiveNode[]
  initialConnections?: NodeConnection[]
}

export function useCognitiveMap({ 
  mapId, 
  initialNodes = [], 
  initialConnections = [] 
}: UseCognitiveMapProps = {}) {
  const [nodes, setNodes] = useState<CognitiveNode[]>(initialNodes)
  const [connections, setConnections] = useState<NodeConnection[]>(initialConnections)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load cognitive map data
  const loadMap = useCallback(async (id: string) => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const map = await cognitiveMapAPI.getCognitiveMap(id)
      setNodes(map.nodes || [])
      setConnections(map.connections || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cognitive map'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load map on mount if mapId is provided
  useEffect(() => {
    if (mapId) {
      loadMap(mapId)
    }
  }, [mapId, loadMap])

  // Node operations
  const createNode = useCallback(async (nodeData: Partial<CognitiveNode>) => {
    if (!mapId) {
      toast.error('No map selected')
      return
    }

    try {
      const newNode = await cognitiveMapAPI.createNode(mapId, nodeData)
      setNodes(prev => [...prev, newNode])
      toast.success('Node created successfully')
      return newNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node'
      toast.error(errorMessage)
      throw err
    }
  }, [mapId])

  const updateNode = useCallback(async (nodeId: string, updates: Partial<CognitiveNode>) => {
    if (!mapId) {
      toast.error('No map selected')
      return
    }

    try {
      const updatedNode = await cognitiveMapAPI.updateNode(mapId, nodeId, updates)
      setNodes(prev => prev.map(node => 
        node.id === nodeId ? { ...node, ...updatedNode } : node
      ))
      return updatedNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node'
      toast.error(errorMessage)
      throw err
    }
  }, [mapId])

  const deleteNode = useCallback(async (nodeId: string) => {
    if (!mapId) {
      toast.error('No map selected')
      return
    }

    try {
      await cognitiveMapAPI.deleteNode(mapId, nodeId)
      setNodes(prev => prev.filter(node => node.id !== nodeId))
      // Also remove connections involving this node
      setConnections(prev => prev.filter(conn => 
        conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      ))
      toast.success('Node deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node'
      toast.error(errorMessage)
      throw err
    }
  }, [mapId])

  // Connection operations
  const createConnection = useCallback(async (connectionData: Partial<NodeConnection>) => {
    if (!mapId) {
      toast.error('No map selected')
      return
    }

    try {
      const newConnection = await cognitiveMapAPI.createConnection(mapId, connectionData)
      setConnections(prev => [...prev, newConnection])
      toast.success('Connection created successfully')
      return newConnection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create connection'
      toast.error(errorMessage)
      throw err
    }
  }, [mapId])

  const updateConnection = useCallback(async (connectionId: string, updates: Partial<NodeConnection>) => {
    if (!mapId) {
      toast.error('No map selected')
      return
    }

    try {
      const updatedConnection = await cognitiveMapAPI.updateConnection(mapId, connectionId, updates)
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId ? { ...conn, ...updatedConnection } : conn
      ))
      return updatedConnection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update connection'
      toast.error(errorMessage)
      throw err
    }
  }, [mapId])

  const deleteConnection = useCallback(async (connectionId: string) => {
    if (!mapId) {
      toast.error('No map selected')
      return
    }

    try {
      await cognitiveMapAPI.deleteConnection(mapId, connectionId)
      setConnections(prev => prev.filter(conn => conn.id !== connectionId))
      toast.success('Connection deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete connection'
      toast.error(errorMessage)
      throw err
    }
  }, [mapId])

  // Utility functions
  const getNodeById = useCallback((nodeId: string) => {
    return nodes.find(node => node.id === nodeId)
  }, [nodes])

  const getConnectionById = useCallback((connectionId: string) => {
    return connections.find(conn => conn.id === connectionId)
  }, [connections])

  const getNodeConnections = useCallback((nodeId: string) => {
    return connections.filter(conn => 
      conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId
    )
  }, [connections])

  const refresh = useCallback(() => {
    if (mapId) {
      loadMap(mapId)
    }
  }, [mapId, loadMap])

  return {
    // State
    nodes,
    connections,
    loading,
    error,
    
    // Operations
    createNode,
    updateNode,
    deleteNode,
    createConnection,
    updateConnection,
    deleteConnection,
    
    // Utilities
    getNodeById,
    getConnectionById,
    getNodeConnections,
    refresh,
    loadMap,
  }
}