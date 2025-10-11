// Enhanced test script to debug cognitive map generation issues
const fetch = require('node-fetch');

async function testCognitiveMapGenerationDebug() {
  console.log('🧪 Testing Cognitive Map Generation with Debug Info...\n');
  
  try {
    // Step 1: Create a test document
    console.log('📄 Creating test document...');
    const documentResponse = await fetch('http://localhost:3000/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Machine Learning Fundamentals',
        content: `Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data. 
        
        Supervised learning uses labeled training data to learn a mapping function from inputs to outputs. Common algorithms include linear regression, decision trees, and neural networks.
        
        Unsupervised learning finds patterns in data without labeled examples. Clustering algorithms like K-means group similar data points together.
        
        Deep learning uses neural networks with multiple layers to learn complex patterns. Convolutional neural networks are particularly effective for image recognition tasks.
        
        Feature engineering involves selecting and transforming input variables to improve model performance. Cross-validation helps evaluate model generalization.`,
        tags: ['machine-learning', 'ai', 'algorithms']
      }),
    });
    
    if (!documentResponse.ok) {
      const error = await documentResponse.text();
      console.error('❌ Failed to create document:', error);
      return;
    }
    
    const { document } = await documentResponse.json();
    console.log('✅ Document created:', document.id, '-', document.title);
    
    // Step 2: Create a cognitive map
    console.log('\n🧠 Creating cognitive map...');
    const mapResponse = await fetch('http://localhost:3000/api/cognitive-maps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Test Map: ${document.title}`,
        description: `Auto-generated test map from document: ${document.title}`,
        isPublic: false,
      }),
    });
    
    if (!mapResponse.ok) {
      const error = await mapResponse.text();
      console.error('❌ Failed to create cognitive map:', error);
      return;
    }
    
    const { map } = await mapResponse.json();
    console.log('✅ Cognitive map created:', map.id, '-', map.title);
    console.log('   Map userId:', map.userId);
    console.log('   Map isPublic:', map.isPublic);
    
    // Step 2.5: Verify the map exists by fetching it directly
    console.log('\n🔍 Verifying map exists...');
    const verifyMapResponse = await fetch(`http://localhost:3000/api/cognitive-maps/${map.id}`);
    
    if (verifyMapResponse.ok) {
      const verifyData = await verifyMapResponse.json();
      console.log('✅ Map verification successful:');
      console.log('   Map found with ID:', verifyData.map.id);
      console.log('   Map title:', verifyData.map.title);
      console.log('   Map userId:', verifyData.map.userId);
      console.log('   Current nodes:', verifyData.map.nodes?.length || 0);
    } else {
      const verifyError = await verifyMapResponse.json();
      console.error('❌ Map verification failed:', verifyError);
      console.log('   Status:', verifyMapResponse.status);
      return;
    }
    
    // Step 2.6: List all maps for the user to see what's available
    console.log('\n📋 Listing all user maps...');
    const listMapsResponse = await fetch('http://localhost:3000/api/cognitive-maps');
    
    if (listMapsResponse.ok) {
      const listData = await listMapsResponse.json();
      console.log('✅ User maps found:', listData.maps?.length || 0);
      listData.maps?.forEach((userMap, index) => {
        console.log(`   ${index + 1}. ${userMap.id} - ${userMap.title} (nodes: ${userMap.nodes?.length || 0})`);
      });
    } else {
      console.log('⚠️  Could not list user maps');
    }
    
    // Step 3: Wait a moment to ensure any async operations complete
    console.log('\n⏳ Waiting 2 seconds for any async operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Generate nodes from document
    console.log('\n🔗 Generating nodes from document...');
    console.log('   Using documentId:', document.id);
    console.log('   Using mapId:', map.id);
    
    const nodesResponse = await fetch('http://localhost:3000/api/ai/generate-nodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: document.id,
        mapId: map.id,
        maxNodes: 6,
      }),
    });
    
    const nodesData = await nodesResponse.json();
    
    console.log('📊 Node generation response:');
    console.log('   Status:', nodesResponse.status);
    console.log('   Success:', nodesData.success);
    console.log('   Error:', nodesData.error || 'none');
    console.log('   Nodes created:', nodesData.nodes?.length || 0);
    console.log('   Connections created:', nodesData.connections?.length || 0);
    console.log('   Fallback used:', nodesData.fallback || false);
    
    if (!nodesResponse.ok) {
      console.error('❌ Node generation failed');
      console.log('Full response:', JSON.stringify(nodesData, null, 2));
      
      // Try to understand why it failed
      if (nodesData.error === 'Map not found') {
        console.log('\n🔍 Debugging map not found issue...');
        console.log('   Requested mapId:', nodesData.mapId);
        console.log('   Requested userId:', nodesData.userId);
        
        // Check if the map still exists
        const recheckResponse = await fetch(`http://localhost:3000/api/cognitive-maps/${map.id}`);
        if (recheckResponse.ok) {
          const recheckData = await recheckResponse.json();
          console.log('   Map still exists in API');
          console.log('   Map userId in recheck:', recheckData.map.userId);
        } else {
          console.log('   Map no longer exists in API');
        }
      }
      return;
    }
    
    console.log('✅ Nodes generated successfully!');
    
    if (nodesData.nodes && nodesData.nodes.length > 0) {
      console.log('\n📝 Generated Nodes:');
      nodesData.nodes.forEach((node, index) => {
        console.log(`   ${index + 1}. ${node.title}`);
        console.log(`      Content: ${node.content?.substring(0, 80)}...`);
        console.log(`      Position: (${node.positionX}, ${node.positionY})`);
        console.log(`      Metadata: ${JSON.stringify(node.metadata)}`);
      });
    }
    
    if (nodesData.connections && nodesData.connections.length > 0) {
      console.log('\n🔗 Generated Connections:');
      nodesData.connections.forEach((conn, index) => {
        console.log(`   ${index + 1}. ${conn.label} (strength: ${conn.strength})`);
      });
    }
    
    if (nodesData.analysis) {
      console.log('\n📈 Analysis Summary:');
      console.log(`   Summary: ${nodesData.analysis.summary?.substring(0, 100)}...`);
      console.log(`   Key Topics: ${nodesData.analysis.keyTopics?.join(', ')}`);
    }
    
    // Step 5: Final verification
    console.log('\n🔍 Final map verification...');
    const finalVerifyResponse = await fetch(`http://localhost:3000/api/cognitive-maps/${map.id}`);
    
    if (finalVerifyResponse.ok) {
      const finalData = await finalVerifyResponse.json();
      console.log('✅ Final verification successful:');
      console.log(`   - Total nodes in map: ${finalData.map?.nodes?.length || 0}`);
      console.log(`   - Total connections in map: ${finalData.map?.connections?.length || 0}`);
    } else {
      console.log('⚠️  Final verification failed');
    }
    
    console.log('\n🎉 Test completed!');
    console.log(`🔗 View the generated map at: http://localhost:3000/cognitive-maps/${map.id}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCognitiveMapGenerationDebug();