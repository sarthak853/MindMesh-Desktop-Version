// Test script for Document Analysis with AI
const fs = require('fs')
const path = require('path')

const testDocumentAnalysis = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('📄 Testing Document Analysis with Bytez AI...\n')

  // Read sample document
  const sampleDoc = fs.readFileSync('sample-document.md', 'utf-8')
  
  console.log('1️⃣ Uploading sample document...')
  try {
    const uploadResponse = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Introduction to AI',
        content: sampleDoc,
        type: 'markdown',
        tags: ['AI', 'Machine Learning', 'Education']
      })
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json()
      console.error('❌ Upload failed:', error)
      return
    }

    const uploadData = await uploadResponse.json()
    console.log('✅ Document uploaded successfully!')
    console.log('📝 Document ID:', uploadData.id)
    
    const documentId = uploadData.id

    console.log('\n2️⃣ Generating mindmap nodes from document...')
    try {
      const nodesResponse = await fetch(`${baseUrl}/api/ai/generate-nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: documentId,
          content: sampleDoc.substring(0, 2000) // First 2000 chars
        })
      })

      if (!nodesResponse.ok) {
        const error = await nodesResponse.json()
        console.error('❌ Node generation failed:', error)
      } else {
        const nodesData = await nodesResponse.json()
        console.log('✅ Nodes generated!')
        console.log('📊 Generated', nodesData.nodes?.length || 0, 'nodes')
        if (nodesData.nodes && nodesData.nodes.length > 0) {
          console.log('\n🔹 Sample nodes:')
          nodesData.nodes.slice(0, 3).forEach((node, i) => {
            console.log(`   ${i + 1}. ${node.title} (${node.type})`)
          })
        }
      }
    } catch (error) {
      console.error('❌ Node generation error:', error.message)
    }

    console.log('\n3️⃣ Generating memory cards from document...')
    try {
      const cardsResponse = await fetch(`${baseUrl}/api/ai/generate-memory-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: sampleDoc.substring(0, 1500),
          documentId: documentId
        })
      })

      if (!cardsResponse.ok) {
        const error = await cardsResponse.json()
        console.error('❌ Card generation failed:', error)
      } else {
        const cardsData = await cardsResponse.json()
        console.log('✅ Memory cards generated!')
        console.log('🎴 Generated', cardsData.cards?.length || 0, 'cards')
        if (cardsData.cards && cardsData.cards.length > 0) {
          console.log('\n🔹 Sample card:')
          const card = cardsData.cards[0]
          console.log(`   Q: ${card.front}`)
          console.log(`   A: ${card.back}`)
          console.log(`   Difficulty: ${card.difficulty}`)
          console.log(`   Tags: ${card.tags?.join(', ') || 'None'}`)
        }
      }
    } catch (error) {
      console.error('❌ Card generation error:', error.message)
    }

    console.log('\n4️⃣ Testing connection suggestions...')
    try {
      const connectionsResponse = await fetch(`${baseUrl}/api/ai/generate-connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node1: {
            title: 'Machine Learning',
            content: 'A subset of AI that provides systems the ability to learn from data'
          },
          node2: {
            title: 'Deep Learning',
            content: 'A subset of machine learning using neural networks with multiple layers'
          }
        })
      })

      if (!connectionsResponse.ok) {
        const error = await connectionsResponse.json()
        console.error('❌ Connection generation failed:', error)
      } else {
        const connectionData = await connectionsResponse.json()
        console.log('✅ Connection suggested!')
        if (connectionData.connection) {
          const conn = connectionData.connection
          console.log(`   Type: ${conn.relationshipType}`)
          console.log(`   Label: ${conn.label}`)
          console.log(`   Strength: ${conn.strength}/10`)
          console.log(`   Explanation: ${conn.explanation}`)
        }
      }
    } catch (error) {
      console.error('❌ Connection generation error:', error.message)
    }

    console.log('\n✅ All document analysis tests completed!')
    console.log('\n💡 Next steps:')
    console.log('   - View the document in the UI')
    console.log('   - Create a mindmap from generated nodes')
    console.log('   - Review and study the memory cards')
    console.log('   - Explore connections between concepts')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testDocumentAnalysis().catch(console.error)
