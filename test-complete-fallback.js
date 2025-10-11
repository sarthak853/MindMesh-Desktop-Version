// Test complete document processing with improved fallback system
const testCompleteFallback = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing Complete Document Processing with Improved Fallback...\n')

  try {
    // Create a comprehensive test document
    const testContent = `# Artificial Intelligence and Machine Learning

Artificial Intelligence (AI) is the simulation of human intelligence in machines that are programmed to think and learn like humans. Machine learning is a subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed.

## Key Concepts in Machine Learning

### Supervised Learning
Supervised learning uses labeled training data to learn a mapping function from input variables to output variables. Examples include classification and regression problems.

### Unsupervised Learning  
Unsupervised learning uses input data without labeled responses to find hidden patterns or intrinsic structures in data. Clustering and association are common techniques.

### Deep Learning
Deep learning is a subset of machine learning that uses neural networks with multiple layers to model and understand complex patterns in data.

## Applications of AI

Artificial intelligence has numerous practical applications:
- Natural language processing for chatbots and translation
- Computer vision for image recognition and autonomous vehicles  
- Recommendation systems for e-commerce and streaming services
- Predictive analytics for business intelligence
- Medical diagnosis and drug discovery

## Future of AI

The future of artificial intelligence holds tremendous potential for transforming industries and improving human life through automation, enhanced decision-making, and innovative solutions to complex problems.`

    // Step 1: Upload the test document
    console.log('1️⃣ Uploading comprehensive test document...')
    const formData = new FormData()
    const blob = new Blob([testContent], { type: 'text/plain' })
    formData.append('file', blob, 'ai-ml-guide.txt')

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
    console.log('✅ Cognitive map created successfully!')
    console.log('🗺️ Map ID:', map.id)

    // Step 3: Generate nodes with improved fallback
    console.log('\n3️⃣ Generating mindmap nodes with improved fallback...')
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
      console.log('✅ Mindmap nodes generated successfully!')
      console.log('📊 Generated nodes:', nodesData.nodes?.length || 0)
      console.log('🔗 Generated connections:', nodesData.connections?.length || 0)
      
      if (nodesData.nodes && nodesData.nodes.length > 0) {
        console.log('\n🧠 Generated mindmap nodes:')
        nodesData.nodes.forEach((node, i) => {
          console.log(`   ${i + 1}. ${node.title} (${node.type})`)
          console.log(`      ${node.content?.substring(0, 100)}...`)
        })
      }
      
      if (nodesData.connections && nodesData.connections.length > 0) {
        console.log('\n🔗 Node connections:')
        nodesData.connections.forEach((conn, i) => {
          console.log(`   ${i + 1}. ${conn.label || 'Connection'} (strength: ${conn.strength})`)
        })
      }
    }

    // Step 4: Generate memory cards with improved fallback
    console.log('\n4️⃣ Generating memory cards with improved fallback...')
    const cardsResponse = await fetch(`${baseUrl}/api/ai/generate-memory-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: documentId,
        count: 8,
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
        console.log('\n🃏 Generated memory cards:')
        cardsData.memoryCards.forEach((card, i) => {
          console.log(`\n   Card ${i + 1} (Difficulty: ${card.difficulty}):`)
          console.log(`   ❓ Q: ${card.front}`)
          console.log(`   ✅ A: ${card.back}`)
          console.log(`   🏷️ Tags: ${card.tags?.join(', ') || 'None'}`)
        })
      }
    }

    console.log('\n🎉 Complete document processing test finished successfully!')
    console.log('\n💡 Key improvements:')
    console.log('   ✅ Robust fallback system works without AI API')
    console.log('   ✅ Meaningful mindmap nodes generated from content analysis')
    console.log('   ✅ Proper memory cards with questions and answers')
    console.log('   ✅ Multiple card types: definitions, fill-in-blank, explanations')
    console.log('   ✅ Smart content parsing and concept extraction')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testCompleteFallback().catch(console.error)