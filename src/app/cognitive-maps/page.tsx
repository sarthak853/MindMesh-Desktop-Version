'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CognitiveMapCanvas } from '@/components/cognitive-map/cognitive-map-canvas'
import { cognitiveMapAPI } from '@/lib/api/cognitive-map-api'
import { toast } from 'sonner'
import { Plus, Map, ArrowLeft } from 'lucide-react'

interface CognitiveMap {
  id: string
  title: string
  description?: string
  nodeCount: number
  connectionCount: number
  updatedAt: string
}

export default function CognitiveMapsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [maps, setMaps] = useState<CognitiveMap[]>([])
  const [selectedMap, setSelectedMap] = useState<string | null>(null)
  const [selectedMapData, setSelectedMapData] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMap, setIsLoadingMap] = useState(false)
  const [canvasActions, setCanvasActions] = useState<{
    save: () => Promise<void>
    exportPNG: () => Promise<void>
    exportPDF: () => Promise<void>
  } | null>(null)

  // Memoize to avoid triggering child effect repeatedly and causing update loops
  const handleExposeActions = useCallback((actions: {
    save: () => Promise<void>
    exportPNG: () => Promise<void>
    exportPDF: () => Promise<void>
  }) => {
    setCanvasActions(actions)
  }, [])

  useEffect(() => {
    // Only load maps if user is available
    if (user) {
      loadCognitiveMaps()
    }
  }, [user])

  const loadCognitiveMaps = async () => {
    // Prevent multiple simultaneous loads
    if (isLoading) {
      console.log('Already loading, skipping...')
      return
    }

    try {
      // Check if user is authenticated
      if (!user) {
        console.log('No user authenticated, skipping map load')
        setMaps([])
        return
      }
      
      setIsLoading(true)
      console.log('Loading cognitive maps for user:', user.id)
      const maps = await cognitiveMapAPI.getUserMaps()
      console.log('Loaded maps:', maps)
      setMaps(maps || [])
    } catch (err) {
      console.error('Error loading cognitive maps:', err)
      // Set empty array on error to prevent crashes
      setMaps([])
      // Don't show error toast if it's just an empty result
      if (err instanceof Error && !err.message.includes('401')) {
        toast.error('Failed to load cognitive maps')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createNewMap = () => {
    setIsCreating(true)
    setSelectedMap('new')
  }

  const openMap = async (mapId: string) => {
    try {
      setIsLoadingMap(true)
      setSelectedMap(mapId)
      console.log('Loading map data for:', mapId)
      
      // Load the full map data with nodes and connections
      const mapData = await cognitiveMapAPI.getCognitiveMap(mapId)
      console.log('Loaded map data:', mapData)
      setSelectedMapData(mapData)
    } catch (error) {
      console.error('Error loading map:', error)
      toast.error('Failed to load cognitive map')
      setSelectedMap(null)
    } finally {
      setIsLoadingMap(false)
    }
  }

  const goBack = () => {
    setSelectedMap(null)
    setSelectedMapData(null)
    setIsCreating(false)
  }

  if (selectedMap) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button variant="ghost" onClick={goBack} className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Maps
                </Button>
                <Map className="h-6 w-6 text-blue-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">
                  {isCreating ? 'New Cognitive Map' : maps.find(m => m.id === selectedMap)?.title}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={() => canvasActions?.exportPNG()}>
                  Export PNG
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Cognitive Map Canvas */}
        <div className="h-[calc(100vh-4rem)] overflow-hidden">
          {isLoadingMap ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading cognitive map...</p>
              </div>
            </div>
          ) : (
            <CognitiveMapCanvas
              initialNodes={
                isCreating 
                  ? [
                      {
                        id: 'n1',
                        type: 'mindmap',
                        position: { x: 150, y: 140 },
                        data: { label: 'Central Concept' },
                      },
                      {
                        id: 'n2',
                        type: 'mindmap',
                        position: { x: 380, y: 90 },
                        data: { label: 'Idea A' },
                      },
                      {
                        id: 'n3',
                        type: 'mindmap',
                        position: { x: 380, y: 210 },
                        data: { label: 'Idea B' },
                      },
                    ]
                  : selectedMapData?.map?.nodes?.map((node: any) => ({
                      id: node.id,
                      type: 'mindmap',
                      position: { x: node.positionX || 100, y: node.positionY || 100 },
                      data: { 
                        label: node.title || 'Concept',
                        description: node.content || ''
                      },
                    })) || []
              }
              initialEdges={
                isCreating
                  ? [
                      { id: 'e1-2', source: 'n1', target: 'n2' },
                      { id: 'e1-3', source: 'n1', target: 'n3' },
                    ]
                  : selectedMapData?.map?.connections?.map((conn: any) => ({
                      id: conn.id,
                      source: conn.sourceNodeId,
                      target: conn.targetNodeId,
                      label: conn.label || '',
                      type: 'default',
                      animated: false,
                      style: { stroke: '#94a3b8', strokeWidth: 2 }
                    })) || []
              }
              onSave={() => {
                // After save in canvas, refresh list and return
                loadCognitiveMaps()
                toast.success('Map saved. Returning to list...')
                goBack()
              }}
              onEdgeCreate={(edge) => {
                console.log('Created connection', edge)
              }}
              onNodeDragStop={(node) => {
                console.log('Node moved', node.id, node.position)
              }}
              exposeActions={handleExposeActions}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push('/')} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Map className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Cognitive Maps</h1>
            </div>
            <Button onClick={createNewMap}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Map
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Knowledge Maps</h2>
          <p className="text-gray-600">
            Visualize and organize your knowledge with interactive cognitive maps
          </p>
        </div>

        {maps.length === 0 ? (
          <div className="text-center py-12">
            <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No cognitive maps yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first cognitive map to start organizing your knowledge visually.
            </p>
            <Button onClick={createNewMap}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Map
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maps.map((map) => (
              <Card 
                key={map.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openMap(map.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{map.title}</CardTitle>
                  <CardDescription>{map.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{map.nodeCount} nodes, {map.connectionCount} connections</span>
                    <span>Updated {map.updatedAt}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Map Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-dashed border-2 border-gray-300"
              onClick={createNewMap}
            >
              <CardContent className="flex flex-col items-center justify-center h-32">
                <Plus className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-gray-500">Create New Map</span>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}