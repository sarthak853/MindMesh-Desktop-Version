// Test script for AI Chat functionality with Bytez
const testAIChat = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing AI Chat with Bytez...\n')

  // Test 1: Check AI Status
  console.log('1️⃣ Checking AI Status...')
  try {
    const statusResponse = await fetch(`${baseUrl}/api/ai/status`)
    const status = await statusResponse.json()
    console.log('✅ AI Status:', JSON.stringify(status, null, 2))
    
    if (!status.hasBytez) {
      console.error('❌ Bytez API key not detected!')
      return
    }
    
    if (status.provider !== 'bytez') {
      console.warn('⚠️  Provider is not set to bytez:', status.provider)
    }
  } catch (error) {
    console.error('❌ Failed to check status:', error.message)
    return
  }

  console.log('\n2️⃣ Testing AI Chat (Scholar Mode)...')
  try {
    const chatResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'What is machine learning? Explain it in simple terms.',
        mode: 'scholar',
        documentIds: [],
        conversationHistory: []
      })
    })

    if (!chatResponse.ok) {
      const error = await chatResponse.json()
      console.error('❌ Chat request failed:', error)
      return
    }

    const chatData = await chatResponse.json()
    console.log('✅ AI Response received!')
    console.log('\n📝 Response Content:')
    console.log(chatData.response.content.substring(0, 300) + '...')
    console.log('\n📊 Metadata:')
    console.log('- Confidence:', chatData.response.confidence)
    console.log('- Citations:', chatData.response.citations?.length || 0)
    console.log('- Related Concepts:', chatData.response.relatedConcepts?.join(', ') || 'None')
  } catch (error) {
    console.error('❌ Chat test failed:', error.message)
    return
  }

  console.log('\n3️⃣ Testing AI Chat (Explorer Mode)...')
  try {
    const explorerResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Give me creative ideas for learning programming',
        mode: 'explorer',
        documentIds: [],
        conversationHistory: []
      })
    })

    if (!explorerResponse.ok) {
      const error = await explorerResponse.json()
      console.error('❌ Explorer mode failed:', error)
      return
    }

    const explorerData = await explorerResponse.json()
    console.log('✅ Explorer mode response received!')
    console.log('\n💡 Creative Response:')
    console.log(explorerData.response.content.substring(0, 300) + '...')
  } catch (error) {
    console.error('❌ Explorer test failed:', error.message)
  }

  console.log('\n✅ All tests completed!')
}

// Run the test
testAIChat().catch(console.error)
