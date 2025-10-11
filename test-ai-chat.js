// Test the AI chat endpoint
const testAIChat = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🤖 Testing AI Chat Endpoint...\n')

  try {
    // Test basic chat functionality
    console.log('1️⃣ Testing basic AI chat...')
    const chatResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'What is machine learning?',
        mode: 'scholar',
        conversationHistory: []
      }),
    })

    if (!chatResponse.ok) {
      const error = await chatResponse.json()
      console.error('❌ AI chat failed:', error)
    } else {
      const chatData = await chatResponse.json()
      console.log('✅ AI chat response received!')
      console.log('📝 Response length:', chatData.response?.content?.length || 0)
      console.log('🔗 Citations:', chatData.response?.citations?.length || 0)
      console.log('💡 Suggested actions:', chatData.response?.suggestedActions?.length || 0)
      
      if (chatData.response?.content) {
        console.log('\n📄 Sample response:')
        console.log(chatData.response.content.substring(0, 200) + '...')
      }
    }

    // Test explorer mode
    console.log('\n2️⃣ Testing explorer mode...')
    const explorerResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'How can I be more creative with my learning?',
        mode: 'explorer',
        conversationHistory: []
      }),
    })

    if (!explorerResponse.ok) {
      const error = await explorerResponse.json()
      console.error('❌ Explorer mode failed:', error)
    } else {
      const explorerData = await explorerResponse.json()
      console.log('✅ Explorer mode response received!')
      console.log('📝 Response length:', explorerData.response?.content?.length || 0)
      
      if (explorerData.response?.content) {
        console.log('\n🎨 Explorer response sample:')
        console.log(explorerData.response.content.substring(0, 200) + '...')
      }
    }

    console.log('\n🎉 AI Chat endpoint test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testAIChat().catch(console.error)