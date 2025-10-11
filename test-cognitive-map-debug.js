// Debug cognitive map creation process
const testCognitiveMapDebug = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🗺️ Debugging Cognitive Map Creation...\n')

  try {
    // Step 1: Upload a test document
    console.log('1️⃣ Uploading test document...')
    const testContent = `# Test Document for Mindmap

This is a test document to verify cognitive map generation.

## Key Concepts
- Artificial Intelligence
- Machine Learning  
- Neural Networks
- Data Processing

## Applications
- Image Recognition
- Natural Language Processing
- Predictive Analytics

This document should generate meaningful nodes and connections.`

    const formData = new FormData()
    const blob = new Blob([testContent], { type: 'text/plain' })
    formData.append('file', blob, 'test-mindmap-doc.txt')

    const uploadResponse = await fetch(`${baseUrl}/api/documents/upload/`, {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json()
      console.error('❌ Upload failed:', error)
      return
    }

    const uploadData = await uploadResponse.json()
    console.log('✅ Document uploaded!')
    console.log('📄 Document ID:', uploadData.document.id)
    console.log('📝 Document Title:', uploadData.document.title)
    console.log('📊 Content Length:', uploadData.document.content?.length || 0)
    
    const documentId = uploadData.document.id

    // Step 2: Create cognitive map
    console.log('\n2️⃣ Creating cognitive map...')
    const mapResponse = await fetch(`${baseUrl}/api/cognitive-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Debug Mindmap: ${uploadData.document.title}`,
        description: `Debug test for document processing`,
        isPublic: false,
      }),
    })

    console.log('Map creation response status:', mapResponse.status)
    
    if (!mapResponse.ok) {
      const error = await mapResponse.json()
      console.error('❌ Map creation failed:', error)
      return
    }

    const { map } = await mapResponse.json()
    console.log('✅ Cognitive map created successfully!')
    console.log('🗺️ Map ID:', map.id)
    console.log('👤 Map User ID:', map.userId)
    console.log('📝 Map Title:', map.title)

    // Step 3: Verify the map exists by listing all maps
    console.log('\n3️⃣ Verifying map in database...')
    const listResponse = await fetch(`${baseUrl}/api/cognitive-maps`)
    if (listResponse.ok) {
      const listData = await listResponse.json()
      console.log('📊 Total maps in system:', listData.maps?.length || 0)
      const ourMap = listData.maps?.find(m => m.id === map.id)
      if (ourMap) {
        console.log('✅ Map found in database!')
        console.log('📋 Map details:', {
          id: ourMap.id,
          title: ourMap.title,
          userId: ourMap.userId,
          nodeCount: ourMap.nodes?.length || 0
        })
      } else {
        console.log('❌ Map NOT found in database!')
        console.log('Available maps:', listData.maps?.map(m => ({ id: m.id, title: m.title })))
      }
    }

    // Step 4: Generate nodes
    console.log('\n4️⃣ Generating nodes for the map...')
    const nodesResponse = await fetch(`${baseUrl}/api/ai/generate-nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: documentId,
        mapId: map.id,
        maxNodes: 5,
      }),
    })

    console.log('Node generation response status:', nodesResponse.status)
    
    const nodesData = await nodesResponse.json()
    console.log('Node generation response data:', {
      success: nodesData.success,
      nodeCount: nodesData.nodes?.length || 0,
      connectionCount: nodesData.connections?.length || 0,
      error: nodesData.error,
      fallback: nodesData.fallback
    })

    if (nodesData.success && nodesData.nodes?.length > 0) {
      console.log('✅ Nodes generated successfully!')
      console.log('\n🧠 Generated nodes:')
      nodesData.nodes.forEach((node, i) => {
        console.log(`   ${i + 1}. ${node.title} (${node.type})`)
        console.log(`      Position: (${node.positionX}, ${node.positionY})`)
        console.log(`      Content: ${node.content?.substring(0, 50)}...`)
      })

      if (nodesData.connections?.length > 0) {
        console.log('\n🔗 Generated connections:')
        nodesData.connections.forEach((conn, i) => {
          console.log(`   ${i + 1}. ${conn.label || 'Connection'} (strength: ${conn.strength})`)
        })
      }
    } else {
      console.log('❌ Node generation failed or returned no nodes')
      if (nodesData.error) {
        console.log('Error details:', nodesData.error)
      }
    }

    // Step 5: Verify the final map state
    console.log('\n5️⃣ Checking final map state...')
    const finalMapResponse = await fetch(`${baseUrl}/api/cognitive-maps`)
    if (finalMapResponse.ok) {
      const finalData = await finalMapResponse.json()
      const finalMap = finalData.maps?.find(m => m.id === map.id)
      if (finalMap) {
        console.log('✅ Final map state:')
        console.log('📊 Nodes:', finalMap.nodes?.length || 0)
        console.log('🔗 Connections:', finalMap.connections?.length || 0)
      }
    }

    console.log('\n🎉 Cognitive map debug completed!')

  } catch (error) {
    console.error('❌ Debug test failed:', error.message)
  }
}

// Run the debug test
testCognitiveMapDebug().catch(console.error)