// Test AI service status and functionality
const fetch = require('node-fetch');

async function testAIStatus() {
  console.log('🧪 Testing AI Service Status...\n');
  
  try {
    // Test AI connection status
    console.log('📡 Testing AI connection...');
    const statusResponse = await fetch('http://localhost:3000/api/ai/test-connection');
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ AI Status Response:');
      console.log('   Status:', statusData.status);
      console.log('   Fallback Mode:', statusData.fallbackMode);
      console.log('   API Key:', statusData.details?.bytezClient?.apiKey);
      console.log('   Model:', statusData.details?.bytezClient?.model);
      console.log('   Available:', statusData.details?.bytezClient?.available);
      
      if (statusData.details?.apiTest) {
        console.log('   API Test Success:', statusData.details.apiTest.success);
        if (!statusData.details.apiTest.success) {
          console.log('   Error Type:', statusData.details.apiTest.errorType);
          console.log('   Error:', statusData.details.apiTest.error);
        }
      }
      
      if (statusData.recommendations?.length > 0) {
        console.log('\n💡 Recommendations:');
        statusData.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
    } else {
      console.log('❌ Failed to get AI status');
    }
    
    // Test with a simple message
    console.log('\n💬 Testing AI chat...');
    const chatResponse = await fetch('http://localhost:3000/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello, can you respond with just "AI working"?'
      }),
    });
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('✅ Chat Test Response:');
      console.log('   Success:', chatData.success);
      if (chatData.success) {
        console.log('   AI Response:', chatData.response);
        console.log('   Model Used:', chatData.model);
      } else {
        console.log('   Error:', chatData.error);
        console.log('   Fallback Response:', chatData.fallbackResponse);
      }
    } else {
      console.log('❌ Failed to test AI chat');
    }
    
    console.log('\n🎉 AI status test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testAIStatus();