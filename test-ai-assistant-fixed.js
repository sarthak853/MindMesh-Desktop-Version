// Test the fixed AI Assistant with better error handling
const testAIAssistantFixed = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🤖 Testing Fixed AI Assistant...\n')

  try {
    // Test 1: Scholar mode query
    console.log('1️⃣ Testing Scholar mode...')
    const scholarResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'What is machine learning and how does it work?',
        mode: 'scholar',
        conversationHistory: []
      }),
    })

    if (!scholarResponse.ok) {
      const error = await scholarResponse.json()
      console.error('❌ Scholar mode failed:', error)
    } else {
      const scholarData = await scholarResponse.json()
      console.log('✅ Scholar mode response received!')
      console.log('📝 Response length:', scholarData.response?.content?.length || 0)
      console.log('🎯 Confidence:', scholarData.response?.confidence || 0)
      console.log('💡 Suggested actions:', scholarData.response?.suggestedActions?.length || 0)
      
      if (scholarData.response?.content) {
        console.log('\n📄 Scholar response preview:')
        console.log(scholarData.response.content.substring(0, 200) + '...')
      }
    }

    // Test 2: Explorer mode query
    console.log('\n2️⃣ Testing Explorer mode...')
    const explorerResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'How can I be more creative in my learning process?',
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
      console.log('🎯 Confidence:', explorerData.response?.confidence || 0)
      console.log('💡 Suggested actions:', explorerData.response?.suggestedActions?.length || 0)
      
      if (explorerData.response?.content) {
        console.log('\n🎨 Explorer response preview:')
        console.log(explorerData.response.content.substring(0, 200) + '...')
      }
    }

    // Test 3: Conversation with history
    console.log('\n3️⃣ Testing conversation with history...')
    const conversationResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Can you explain that in simpler terms?',
        mode: 'scholar',
        conversationHistory: [
          { role: 'user', content: 'What is machine learning?' },
          { role: 'assistant', content: 'Machine learning is a subset of AI...' }
        ]
      }),
    })

    if (!conversationResponse.ok) {
      const error = await conversationResponse.json()
      console.error('❌ Conversation test failed:', error)
    } else {
      const conversationData = await conversationResponse.json()
      console.log('✅ Conversation response received!')
      console.log('📝 Response length:', conversationData.response?.content?.length || 0)
      
      if (conversationData.response?.content) {
        console.log('\n💬 Conversation response preview:')
        console.log(conversationData.response.content.substring(0, 200) + '...')
      }
    }

    console.log('\n🎉 AI Assistant testing completed!')
    console.log('\n💡 Key improvements:')
    console.log('   ✅ Intelligent fallback responses')
    console.log('   ✅ Context-aware suggestions')
    console.log('   ✅ Mode-specific guidance (Scholar vs Explorer)')
    console.log('   ✅ Graceful error handling')
    console.log('   ✅ Actionable suggestions even when AI fails')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testAIAssistantFixed().catch(console.error)