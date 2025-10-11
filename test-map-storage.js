// Simple test to verify cognitive map storage and retrieval
const fetch = require('node-fetch');

async function testMapStorage() {
  console.log('🧪 Testing Cognitive Map Storage...\n');
  
  try {
    // Step 1: Create a cognitive map
    console.log('🧠 Creating cognitive map...');
    const mapResponse = await fetch('http://localhost:3000/api/cognitive-maps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Storage Map',
        description: 'Testing map storage and retrieval',
        isPublic: false,
      }),
    });
    
    if (!mapResponse.ok) {
      const error = await mapResponse.text();
      console.error('❌ Failed to create cognitive map:', error);
      return;
    }
    
    const { map } = await mapResponse.json();
    console.log('✅ Cognitive map created:', map.id);
    console.log('   Title:', map.title);
    console.log('   UserId:', map.userId);
    console.log('   IsPublic:', map.isPublic);
    
    // Step 2: Immediately try to retrieve the map
    console.log('\n🔍 Retrieving map immediately...');
    const retrieveResponse = await fetch(`http://localhost:3000/api/cognitive-maps/${map.id}`);
    
    if (retrieveResponse.ok) {
      const retrieveData = await retrieveResponse.json();
      console.log('✅ Map retrieved successfully:');
      console.log('   ID:', retrieveData.map.id);
      console.log('   Title:', retrieveData.map.title);
      console.log('   UserId:', retrieveData.map.userId);
      console.log('   Nodes:', retrieveData.map.nodes?.length || 0);
      console.log('   Connections:', retrieveData.map.connections?.length || 0);
    } else {
      const retrieveError = await retrieveResponse.json();
      console.error('❌ Failed to retrieve map:', retrieveError);
      console.log('   Status:', retrieveResponse.status);
      return;
    }
    
    // Step 3: Wait and try again
    console.log('\n⏳ Waiting 1 second and trying again...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const retrieve2Response = await fetch(`http://localhost:3000/api/cognitive-maps/${map.id}`);
    
    if (retrieve2Response.ok) {
      const retrieve2Data = await retrieve2Response.json();
      console.log('✅ Map retrieved again successfully:');
      console.log('   ID:', retrieve2Data.map.id);
      console.log('   Title:', retrieve2Data.map.title);
      console.log('   UserId:', retrieve2Data.map.userId);
    } else {
      const retrieve2Error = await retrieve2Response.json();
      console.error('❌ Failed to retrieve map second time:', retrieve2Error);
      console.log('   Status:', retrieve2Response.status);
    }
    
    // Step 4: List all maps
    console.log('\n📋 Listing all user maps...');
    const listResponse = await fetch('http://localhost:3000/api/cognitive-maps');
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('✅ Maps listed successfully:');
      console.log('   Total maps:', listData.maps?.length || 0);
      listData.maps?.forEach((userMap, index) => {
        console.log(`   ${index + 1}. ${userMap.id} - ${userMap.title} (userId: ${userMap.userId})`);
      });
      
      // Check if our created map is in the list
      const foundMap = listData.maps?.find(m => m.id === map.id);
      if (foundMap) {
        console.log('✅ Created map found in user maps list');
      } else {
        console.log('❌ Created map NOT found in user maps list');
      }
    } else {
      console.log('⚠️  Could not list user maps');
    }
    
    console.log('\n🎉 Map storage test completed!');
    return map.id;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    return null;
  }
}

// Run the test
testMapStorage().then(mapId => {
  if (mapId) {
    console.log(`\n🔗 Test map created with ID: ${mapId}`);
  }
});