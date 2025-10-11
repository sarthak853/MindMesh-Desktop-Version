// Simple test to debug document processing
const testDocumentProcessing = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing Document Processing API...\n')

  try {
    // Step 1: Test cognitive maps creation
    console.log('1️⃣ Testing cognitive map creation...')
    const mapResponse = await fetch(`${baseUrl}/api/cognitive-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Mindmap: Sample Document',
        description: 'Auto-generated from document: Sample Document',
        isPublic: false,
      }),
    })

    if (!mapResponse.ok) {
      const error = await mapResponse.json()
      console.error('❌ Map creation failed:', error)
      return
    }

    const { map } = await mapResponse.json()
    console.log('✅ Map created successfully!')
    console.log('📝 Map ID:', map.id)

    // Step 2: Test node generation
    console.log('\n2️⃣ Testing node generation...')
    const nodesResponse = await fetch(`${baseUrl}/api/ai/generate-nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: 'test-doc-id',
        mapId: map.id,
        maxNodes: 5,
      }),
    })

    if (!nodesResponse.ok) {
      const error = await nodesResponse.json()
      console.error('❌ Node generation failed:', error)
    } else {
      const nodesData = await nodesResponse.json()
      console.log('✅ Nodes generated!')
      console.log('📊 Generated', nodesData.nodes?.length || 0, 'nodes')
    }

    // Step 3: Test memory card generation
    console.log('\n3️⃣ Testing memory card generation...')
    const cardsResponse = await fetch(`${baseUrl}/api/ai/generate-memory-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: 'test-doc-id',
        count: 5,
      }),
    })

    if (!cardsResponse.ok) {
      const error = await cardsResponse.json()
      console.error('❌ Memory card generation failed:', error)
    } else {
      const cardsData = await cardsResponse.json()
      console.log('✅ Memory cards generated!')
      console.log('🎴 Generated', cardsData.memoryCards?.length || 0, 'cards')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testDocumentProcessing().catch(console.error)