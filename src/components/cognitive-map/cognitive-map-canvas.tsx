'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Connection,
  ReactFlowProvider,
  Panel
} from 'reactflow'
import 'reactflow/dist/style.css'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Plus, 
  Save, 
  RotateCcw
} from 'lucide-react'
import { Download } from 'lucide-react'

import { MindMapNode } from '@/components/cognitive-map/mindmap-node'
import { cognitiveMapAPI } from '@/lib/api/cognitive-map-api'
import { toast } from 'sonner'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

interface CognitiveMapCanvasProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onSave?: (nodes: Node[], edges: Edge[]) => void
  onNodeSelect?: (node: Node | null) => void
  onEdgeSelect?: (edge: Edge | null) => void
  onEdgeCreate?: (edge: Edge) => void
  onNodeDragStop?: (node: Node) => void
  readOnly?: boolean
  className?: string
  exposeActions?: (actions: {
    save: () => Promise<void>
    exportPNG: () => Promise<void>
    exportPDF: () => Promise<void>
  }) => void
}

export function CognitiveMapCanvas({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onNodeSelect,
  onEdgeSelect,
  onEdgeCreate,
  onNodeDragStop,
  readOnly = false,
  className = '',
  exposeActions
}: CognitiveMapCanvasProps) {
  const deleteNode = useCallback((nodeId: string) => {
    if (readOnly) return
    setNodes((nds) => nds.filter(n => n.id !== nodeId))
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
  }, [readOnly])

  // Initialize nodes with callbacks
  const nodesWithCallbacks = useMemo(() => 
    initialNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onChange: (updates: any) => {
          setNodes((nds) => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, ...updates } } : n))
        },
        onDelete: deleteNode
      }
    })),
    [initialNodes, deleteNode]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const flowWrapperRef = useRef<HTMLDivElement | null>(null)

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return
      
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        type: 'default',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 }
      }
      
      setEdges((eds) => addEdge(newEdge, eds))
      if (onEdgeCreate) {
        onEdgeCreate(newEdge as Edge)
      }
    },
    [setEdges, readOnly, onEdgeCreate]
  )

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    if (onNodeSelect) {
      onNodeSelect(node)
    }
  }, [onNodeSelect])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    if (onNodeSelect) {
      onNodeSelect(null)
    }
  }, [onNodeSelect])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return
      
      // Delete selected node with Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault()
        deleteNode(selectedNode.id)
        setSelectedNode(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, readOnly, deleteNode])

  const addNode = useCallback((type: string) => {
    if (readOnly) return

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'mindmap',
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
      data: {
        label: `New ${type}`,
        description: '',
        onChange: (updates: any) => {
          setNodes((nds) => nds.map(n => n.id === newNode.id ? { ...n, data: { ...n.data, ...updates } } : n))
        },
        onDelete: deleteNode
      },
      style: {
        background: '#ffffff',
        border: '2px solid #1a202c',
        borderRadius: '8px',
        padding: '10px'
      }
    }

    setNodes((nds) => nds.concat(newNode))
  }, [setNodes, readOnly, deleteNode])

  const handleSave = useCallback(async () => {
    try {
      const title = window.prompt('Enter a name for this mindmap:')
      if (!title || !title.trim()) return

      // Create the map
      const map = await cognitiveMapAPI.createMap(title.trim())

      // Create nodes and record ID mapping
      const idMap: Record<string, string> = {}
      for (const n of nodes) {
        const created = await cognitiveMapAPI.createNode(map.id, {
          type: 'concept',
          title: n.data?.label || 'Concept',
          content: '',
          position: { x: n.position.x, y: n.position.y },
          metadata: { ui: { type: n.type } }
        })
        idMap[n.id] = created.id
      }

      // Create connections with mapped IDs
      for (const e of edges) {
        const sourceId = idMap[e.source]
        const targetId = idMap[e.target]
        if (sourceId && targetId) {
          await cognitiveMapAPI.createConnection(map.id, {
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            relationshipType: 'related'
          })
        }
      }

      toast.success('Mindmap saved to Cognitive Maps')
      if (onSave) onSave(nodes, edges)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save mindmap'
      toast.error(msg)
    }
  }, [nodes, edges, onSave])

  const exportPNG = useCallback(async () => {
    if (!flowWrapperRef.current) return
    try {
      const dataUrl = await toPng(flowWrapperRef.current, { cacheBust: true })
      const link = document.createElement('a')
      link.download = 'mindmap.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      toast.error('Failed to export PNG')
    }
  }, [])

  const exportPDF = useCallback(async () => {
    if (!flowWrapperRef.current) return
    try {
      const dataUrl = await toPng(flowWrapperRef.current, { cacheBust: true })
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight)
      pdf.save('mindmap.pdf')
    } catch (err) {
      toast.error('Failed to export PDF')
    }
  }, [])

  const nodeTypes = { mindmap: MindMapNode }

  // Stabilize exposed actions to avoid infinite update loops
  const saveRef = React.useRef(handleSave)
  const pngRef = React.useRef(exportPNG)
  const pdfRef = React.useRef(exportPDF)

  React.useEffect(() => {
    saveRef.current = handleSave
  }, [handleSave])

  React.useEffect(() => {
    pngRef.current = exportPNG
  }, [exportPNG])

  React.useEffect(() => {
    pdfRef.current = exportPDF
  }, [exportPDF])

  const stableActions = useMemo(() => ({
    save: async () => {
      return saveRef.current()
    },
    exportPNG: async () => {
      return pngRef.current()
    },
    exportPDF: async () => {
      return pdfRef.current()
    }
  }), [])

  React.useEffect(() => {
    if (exposeActions) {
      exposeActions(stableActions)
    }
    // Only run when the exposeActions callback itself changes
  }, [exposeActions, stableActions])

  return (
    <div className={`h-full w-full overflow-hidden ${className}`}>
      <ReactFlowProvider>
        <div ref={flowWrapperRef} className="relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={(_e, node) => {
              if (onNodeDragStop) onNodeDragStop(node)
            }}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1} 
              color="#e2e8f0"
            />
            
            <MiniMap 
              zoomable
              pannable
              position="top-right"
            />
            
            <Controls 
              position="bottom-right"
              showInteractive={!readOnly}
            />

            {/* Top Panel - Toolbar */}
            <Panel position="top-center">
              <Card className="p-2 bg-white/90 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addNode('concept')}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Node
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportPNG}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportPDF}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export PDF
                      </Button>
                    </>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Fit view functionality
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Fit View
                  </Button>
                </div>
              </Card>
            </Panel>
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  )
}