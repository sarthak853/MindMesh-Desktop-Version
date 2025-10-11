// Debug document processing step by step
const testDocumentDebug = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🔍 Debugging Document Processing Step by Step...\n')

  try {
    // Step 1: Upload document
    console.log('1️⃣ Uploading test document...')
    const testContent = `# Artificial Intelligence Overview

Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines. These systems can perform tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation.

## Key Components

### Machine Learning
Machine learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.

### Neural Networks
Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes that process information.

### Deep Learning
Deep learning uses neural networks with multiple layers to model and understand complex patterns in data.

## Applications
- Healthcare diagnostics
- Autonomous vehicles
- Natural language processing
- Computer vision
- Robotics`

    const formData = new FormData()
    const blob = new Blob([testContent], { type: 'text/plain' })
    formData.append('file', blob, 'ai-overview.txt')

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
    
    const documentId = uploadData.document.id

    // Step 2: Create cognitive map
    console.log('\n2️⃣ Creating cognitive map...')
    const mapResponse = await fetch(`${baseUrl}/api/cognitive-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `AI Overview Mindmap`,
        description: `Generated from AI overview document`,
        isPublic: false,
      }),
    })

    if (!mapResponse.ok) {
      const error = await mapResponse.json()
      console.error('❌ Map creation failed:', error)
      return
    }

    const { map } = await mapResponse.json()
    console.log('✅ Cognitive map created!')
    console.log('🗺️ Map ID:', map.id)
    console.log('👤 Map User ID:', map.userId)

    // Step 3: Verify map exists
    console.log('\n3️⃣ Verifying map exists...')
    const mapCheckResponse = await fetch(`${baseUrl}/api/cognitive-maps`)
    if (mapCheckResponse.ok) {
      const mapsData = await mapCheckResponse.json()
      console.log('📊 Total maps:', mapsData.maps?.length || 0)
      const ourMap = mapsData.maps?.find(m => m.id === map.id)
      if (ourMap) {
        console.log('✅ Our map found in list!')
      } else {
        console.log('❌ Our map NOT found in list!')
      }
    }

    // Step 4: Generate nodes
    console.log('\n4️⃣ Generating nodes...')
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
    
    if (!nodesResponse.ok) {
      const error = await nodesResponse.json()
      console.error('❌ Node generation failed:', error)
      
      // Try to get more details
      console.log('\n🔍 Debugging node generation failure...')
      console.log('Document ID used:', documentId)
      console.log('Map ID used:', map.id)
      
    } else {
      const nodesData = await nodesResponse.json()
      console.log('✅ Nodes generated successfully!')
      console.log('📊 Nodes created:', nodesData.nodes?.length || 0)
      console.log('🔗 Connections created:', nodesData.connections?.length || 0)
      
      if (nodesData.nodes?.length > 0) {
        console.log('\n🧠 Generated nodes:')
        nodesData.nodes.forEach((node, i) => {
          console.log(`   ${i + 1}. ${node.title} (${node.type})`)
        })
      }
    }

    // Step 5: Generate memory cards
    console.log('\n5️⃣ Generating memory cards...')
    const cardsResponse = await fetch(`${baseUrl}/api/ai/generate-memory-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: documentId,
        count: 5,
      }),
    })

    if (!cardsResponse.ok) {
      const error = await cardsResponse.json()
      console.error('❌ Memory card generation failed:', error)
    } else {
      const cardsData = await cardsResponse.json()
      console.log('✅ Memory cards generated!')
      console.log('🎴 Cards created:', cardsData.memoryCards?.length || 0)
      
      if (cardsData.memoryCards?.length > 0) {
        console.log('\n🃏 Sample cards:')
        cardsData.memoryCards.slice(0, 2).forEach((card, i) => {
          console.log(`\n   Card ${i + 1}:`)
          console.log(`   Q: ${card.front}`)
          console.log(`   A: ${card.back}`)
        })
      }
    }

    console.log('\n🎉 Document processing debug completed!')

  } catch (error) {
    console.error('❌ Debug test failed:', error.message)
  }
}

// Run the debug test
testDocumentDebug().catch(console.error)