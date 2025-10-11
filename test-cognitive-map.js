// Test script to verify cognitive map generation from documents
const fetch = require('node-fetch');

async function testCognitiveMapGeneration() {
  console.log('🧪 Testing Cognitive Map Generation...\n');
  
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
    
    // Step 3: Generate nodes from document
    console.log('\n🔗 Generating nodes from document...');
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
    
    if (!nodesResponse.ok) {
      console.error('❌ Node generation failed:', nodesData.error);
      console.log('Response status:', nodesResponse.status);
      console.log('Response data:', JSON.stringify(nodesData, null, 2));
      return;
    }
    
    console.log('✅ Nodes generated successfully!');
    console.log('📊 Results:');
    console.log(`   - Nodes created: ${nodesData.nodes?.length || 0}`);
    console.log(`   - Connections created: ${nodesData.connections?.length || 0}`);
    console.log(`   - Success: ${nodesData.success}`);
    console.log(`   - Fallback used: ${nodesData.fallback || false}`);
    
    if (nodesData.nodes && nodesData.nodes.length > 0) {
      console.log('\n📝 Generated Nodes:');
      nodesData.nodes.forEach((node, index) => {
        console.log(`   ${index + 1}. ${node.title}`);
        console.log(`      Content: ${node.content.substring(0, 80)}...`);
        console.log(`      Position: (${node.positionX}, ${node.positionY})`);
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
    
    // Step 4: Verify the map has nodes
    console.log('\n🔍 Verifying map contents...');
    const verifyResponse = await fetch(`http://localhost:3000/api/cognitive-maps/${map.id}`);
    
    if (verifyResponse.ok) {
      const mapData = await verifyResponse.json();
      console.log('✅ Map verification successful:');
      console.log(`   - Total nodes in map: ${mapData.map?.nodes?.length || 0}`);
      console.log(`   - Total connections in map: ${mapData.map?.connections?.length || 0}`);
    } else {
      console.log('⚠️  Could not verify map contents');
    }
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`🔗 View the generated map at: http://localhost:3000/cognitive-maps/${map.id}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCognitiveMapGeneration();