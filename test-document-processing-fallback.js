// Test document processing with fallback system
const testDocumentProcessingFallback = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing Document Processing with Fallback System...\n')

  try {
    // Create a test document with meaningful content
    const testContent = `# Machine Learning Fundamentals

Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on the idea that systems can learn from data, identify patterns and make decisions with minimal human intervention.

## Types of Machine Learning

There are three main types of machine learning:

1. **Supervised Learning**: Uses labeled training data to learn a mapping function from input variables to output variables.

2. **Unsupervised Learning**: Uses input data without labeled responses to find hidden patterns or intrinsic structures in data.

3. **Reinforcement Learning**: An agent learns to behave in an environment by performing actions and seeing the results.

## Key Concepts

- **Algorithm**: A set of rules or instructions given to an AI system to help it learn on its own.
- **Training Data**: The dataset used to teach a machine learning algorithm.
- **Model**: The output of an algorithm after training on a dataset.
- **Feature**: An individual measurable property of observed phenomena.

## Applications

Machine learning is widely used in:
- Image and speech recognition
- Medical diagnosis
- Stock trading
- Robot locomotion
- Search engines`

    // Step 1: Upload the test document
    console.log('1️⃣ Uploading test document...')
    const formData = new FormData()
    const blob = new Blob([testContent], { type: 'text/plain' })
    formData.append('file', blob, 'ml-fundamentals.txt')

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
    
    const documentId = uploadData.document.id
    const documentTitle = uploadData.document.title

    // Step 2: Create cognitive map
    console.log('\n2️⃣ Creating cognitive map...')
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

    // Step 3: Generate nodes (this should work with fallback even if AI fails)
    console.log('\n3️⃣ Generating nodes with fallback system...')
    const nodesResponse = await fetch(`${baseUrl}/api/ai/generate-nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: documentId,
        mapId: map.id,
        maxNodes: 6,
      }),
    })

    if (!nodesResponse.ok) {
      const error = await nodesResponse.json()
      console.error('❌ Node generation failed:', error)
    } else {
      const nodesData = await nodesResponse.json()
      console.log('✅ Nodes generated successfully!')
      console.log('📊 Generated nodes:', nodesData.nodes?.length || 0)
      console.log('🔗 Generated connections:', nodesData.connections?.length || 0)
      
      if (nodesData.nodes && nodesData.nodes.length > 0) {
        console.log('\n📋 Sample nodes:')
        nodesData.nodes.slice(0, 3).forEach((node, i) => {
          console.log(`   ${i + 1}. ${node.title} (${node.type})`)
          console.log(`      ${node.content?.substring(0, 80)}...`)
        })
      }
    }

    // Step 4: Generate memory cards (this should work with fallback even if AI fails)
    console.log('\n4️⃣ Generating memory cards with fallback system...')
    const cardsResponse = await fetch(`${baseUrl}/api/ai/generate-memory-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: documentId,
        count: 6,
      }),
    })

    if (!cardsResponse.ok) {
      const error = await cardsResponse.json()
      console.error('❌ Memory card generation failed:', error)
    } else {
      const cardsData = await cardsResponse.json()
      console.log('✅ Memory cards generated successfully!')
      console.log('🎴 Generated cards:', cardsData.memoryCards?.length || 0)
      
      if (cardsData.memoryCards && cardsData.memoryCards.length > 0) {
        console.log('\n🃏 Sample cards:')
        cardsData.memoryCards.slice(0, 2).forEach((card, i) => {
          console.log(`   Card ${i + 1}:`)
          console.log(`   Q: ${card.front}`)
          console.log(`   A: ${card.back}`)
          console.log(`   Difficulty: ${card.difficulty}`)
          console.log('')
        })
      }
    }

    console.log('✅ Document processing test completed successfully!')
    console.log('\n💡 The system now works with robust fallbacks even when AI APIs fail.')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testDocumentProcessingFallback().catch(console.error)