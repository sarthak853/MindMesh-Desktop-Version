// Test the full document processing flow
const testFullFlow = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing Full Document Processing Flow...\n')

  try {
    // Step 1: Upload a document
    console.log('1️⃣ Uploading test document...')
    
    // Create a simple test document
    const testContent = `# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence (AI) that provides systems the ability to automatically learn and improve from experience without being explicitly programmed.

## Key Concepts

1. **Supervised Learning**: Learning with labeled training data
2. **Unsupervised Learning**: Finding patterns in data without labels  
3. **Neural Networks**: Computing systems inspired by biological neural networks
4. **Deep Learning**: Machine learning using deep neural networks

## Applications

Machine learning is used in:
- Image recognition
- Natural language processing
- Recommendation systems
- Autonomous vehicles

## Conclusion

Machine learning continues to evolve and transform various industries through its ability to process and learn from large amounts of data.`

    // Create FormData for file upload
    const formData = new FormData()
    const blob = new Blob([testContent], { type: 'text/plain' })
    formData.append('file', blob, 'machine-learning-intro.txt')

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
    console.log('✅ Document uploaded successfully!')
    console.log('📝 Document ID:', uploadData.document.id)
    console.log('📄 Document Title:', uploadData.document.title)
    
    const documentId = uploadData.document.id
    const documentTitle = uploadData.document.title

    // Wait a moment for the document to be fully processed
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 2: Process the document (create mindmap and memory cards)
    console.log('\n2️⃣ Processing document...')
    
    // Create cognitive map
    console.log('Creating cognitive map...')
    const mapResponse = await fetch(`${baseUrl}/api/cognitive-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Mindmap: ${documentTitle}`,
        description: `Auto-generated from document: ${documentTitle}`,
        isPublic: false,
      }),
    })

    if (!mapResponse.ok) {
      const error = await mapResponse.json()
      console.error('❌ Map creation failed:', error)
      return
    }

    const { map } = await mapResponse.json()
    console.log('✅ Cognitive map created:', map.id)

    // Generate nodes
    console.log('Generating nodes...')
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

    if (!nodesResponse.ok) {
      const error = await nodesResponse.json()
      console.error('❌ Node generation failed:', error)
    } else {
      const nodesData = await nodesResponse.json()
      console.log('✅ Nodes generated:', nodesData.nodes?.length || 0)
      if (nodesData.nodes && nodesData.nodes.length > 0) {
        console.log('📊 Sample nodes:')
        nodesData.nodes.slice(0, 3).forEach((node, i) => {
          console.log(`   ${i + 1}. ${node.title} (${node.type})`)
        })
      }
    }

    // Generate memory cards
    console.log('Generating memory cards...')
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
      console.log('✅ Memory cards generated:', cardsData.memoryCards?.length || 0)
      if (cardsData.memoryCards && cardsData.memoryCards.length > 0) {
        console.log('🎴 Sample card:')
        const card = cardsData.memoryCards[0]
        console.log(`   Q: ${card.front}`)
        console.log(`   A: ${card.back}`)
        console.log(`   Difficulty: ${card.difficulty}`)
      }
    }

    console.log('\n✅ Full document processing flow completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testFullFlow().catch(console.error)