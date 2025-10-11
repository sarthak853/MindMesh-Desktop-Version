// Debug script to test individual API endpoints
const testAPIs = async () => {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🔍 Debugging API Endpoints...\n')

  // Test 1: Check if server is running
  try {
    console.log('1️⃣ Testing server connectivity...')
    const healthResponse = await fetch(`${baseUrl}/api/health`)
    if (healthResponse.ok) {
      console.log('✅ Server is running')
    } else {
      console.log('⚠️ Server responded but health check failed')
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible')
    console.log('Please start the development server with: npm run dev')
    return
  }

  // Test 2: Test cognitive maps API
  try {
    console.log('\n2️⃣ Testing cognitive maps API...')
    const mapResponse = await fetch(`${baseUrl}/api/cognitive-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Map',
        description: 'Test description',
        isPublic: false,
      }),
    })

    if (mapResponse.ok) {
      const mapData = await mapResponse.json()
      console.log('✅ Cognitive maps API working')
      console.log('📝 Created map ID:', mapData.map?.id)
    } else {
      const error = await mapResponse.json()
      console.log('❌ Cognitive maps API failed:', error)
    }
  } catch (error) {
    console.log('❌ Cognitive maps API error:', error.message)
  }

  // Test 3: Test AI service directly
  try {
    console.log('\n3️⃣ Testing AI service availability...')
    
    // Check if Bytez API key is configured
    const hasApiKey = process.env.BYTEZ_API_KEY || 'Not configured'
    console.log('🔑 Bytez API Key:', hasApiKey.substring(0, 10) + '...')
    
    // Test a simple AI call
    const testResponse = await fetch(`${baseUrl}/api/ai/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello, this is a test'
      }),
    })

    if (testResponse.ok) {
      const testData = await testResponse.json()
      console.log('✅ AI service is working')
    } else {
      const error = await testResponse.json()
      console.log('❌ AI service failed:', error)
    }
  } catch (error) {
    console.log('❌ AI service error:', error.message)
  }

  console.log('\n🏁 API debugging completed')
}

// Run the debug
testAPIs().catch(console.error)