// Complete test of document processing to cognitive map generation
const fetch = require('node-fetch');

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Document to Cognitive Map Flow...\n');
  
  try {
    // Step 1: Create a test document
    console.log('📄 Step 1: Creating test document...');
    const documentResponse = await fetch('http://localhost:3000/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Artificial Intelligence Overview',
        content: `Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines capable of performing tasks that typically require human intelligence.

Machine Learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed. It uses algorithms to analyze data, identify patterns, and make predictions.

Deep Learning is a specialized form of machine learning that uses neural networks with multiple layers to process complex data. It has revolutionized fields like computer vision and natural language processing.

Natural Language Processing (NLP) focuses on the interaction between computers and human language. It enables machines to understand, interpret, and generate human language in a valuable way.

Computer Vision allows machines to interpret and understand visual information from the world. It combines image processing, pattern recognition, and machine learning techniques.

Robotics integrates AI with mechanical engineering to create autonomous systems that can interact with the physical world. Modern robots use AI for navigation, object recognition, and decision-making.`,
        tags: ['ai', 'machine-learning', 'technology']
      }),
    });
    
    if (!documentResponse.ok) {
      const error = await documentResponse.text();
      console.error('❌ Failed to create document:', error);
      return;
    }
    
    const { document } = await documentResponse.json();
    console.log('✅ Document created successfully');
    console.log('   ID:', document.id);
    console.log('   Title:', document.title);
    console.log('   Content length:', document.content.length);
    
    // Step 2: Create a cognitive map
    console.log('\n🧠 Step 2: Creating cognitive map...');
    const mapResponse = await fetch('http://localhost:3000/api/cognitive-maps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Knowledge Map: ${document.title}`,
        description: `Generated from document: ${document.title}`,
        isPublic: false,
      }),
    });
    
    if (!mapResponse.ok) {
      const error = await mapResponse.text();
      console.error('❌ Failed to create cognitive map:', error);
      return;
    }
    
    const { map } = await mapResponse.json();
    console.log('✅ Cognitive map created successfully');
    console.log('   ID:', map.id);
    console.log('   Title:', map.title);
    console.log('   User ID:', map.userId);
    
    // Step 3: Verify map exists
    console.log('\n🔍 Step 3: Verifying map exists...');
    const verifyResponse = await fetch(`http://localhost:3000/api/cognitive-maps/${map.id}`);
    
    if (!verifyResponse.ok) {
      const verifyError = await verifyResponse.json();
      console.error('❌ Map verification failed:', verifyError);
      return;
    }
    
    const verifyData = await verifyResponse.json();
    console.log('✅ Map verification successful');
    console.log('   Map ID:', verifyData.map.id);
    console.log('   Map Title:', verifyData.map.title);
    console.log('   Map User ID:', verifyData.map.userId);
    console.log('   Current nodes:', verifyData.map.nodes?.length || 0);
    
    // Step 4: Generate nodes from document
    console.log('\n🔗 Step 4: Generating nodes from document...');
    console.log('   Document ID:', document.id);
    console.log('   Map ID:', map.id);
    
    const nodesResponse = await fetch('http://localhost:3000/api/ai/generate-nodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: document.id,
        mapId: map.id,
        maxNodes: 8,
      }),
    });
    
    const nodesData = await nodesResponse.json();
    
    console.log('📊 Node generation results:');
    console.log('   HTTP Status:', nodesResponse.status);
    console.log('   Success:', nodesData.success);
    console.log('   Fallback:', nodesData.fallback || false);
    console.log('   Error:', nodesData.error || 'none');
    console.log('   Nodes created:', nodesData.nodes?.length || 0);
    console.log('   Connections created:', nodesData.connections?.length || 0);
    
    if (!nodesResponse.ok) {
      console.error('❌ Node generation failed');
      console.log('Full error response:', JSON.stringify(nodesData, null, 2));
      return;
    }
    
    console.log('✅ Node generation successful!');
    
    // Display generated nodes
    if (nodesData.nodes && nodesData.nodes.length > 0) {
      console.log('\n📝 Generated Nodes:');
      nodesData.nodes.forEach((node, index) => {
        console.log(`   ${index + 1}. "${node.title}"`);
        console.log(`      Type: ${node.type}`);
        console.log(`      Position: (${node.positionX}, ${node.positionY})`);
        console.log(`      Content: ${node.content?.substring(0, 100)}...`);
        if (node.metadata?.sourceDocument) {
          console.log(`      Source: Document ${node.metadata.sourceDocument}`);
        }
        if (node.metadata?.aiGenerated) {
          console.log(`      AI Generated: ${node.metadata.aiGenerated}`);
        }
        console.log('');
      });
    }
    
    // Display connections
    if (nodesData.connections && nodesData.connections.length > 0) {
      console.log('🔗 Generated Connections:');
      nodesData.connections.forEach((conn, index) => {
        console.log(`   ${index + 1}. "${conn.label}" (strength: ${conn.strength})`);
        console.log(`      Type: ${conn.relationshipType}`);
        console.log(`      From: ${conn.sourceNodeId} → To: ${conn.targetNodeId}`);
        console.log('');
      });
    }
    
    // Display analysis
    if (nodesData.analysis) {
      console.log('📈 AI Analysis:');
      console.log(`   Summary: ${nodesData.analysis.summary?.substring(0, 200)}...`);
      console.log(`   Key Topics: ${nodesData.analysis.keyTopics?.join(', ')}`);
    }
    
    // Step 5: Final verification of the complete map
    console.log('\n🔍 Step 5: Final map verification...');
    const finalResponse = await fetch(`http://localhost:3000/api/cognitive-maps/${map.id}`);
    
    if (finalResponse.ok) {
      const finalData = await finalResponse.json();
      console.log('✅ Final verification successful:');
      console.log(`   Total nodes: ${finalData.map.nodes?.length || 0}`);
      console.log(`   Total connections: ${finalData.map.connections?.length || 0}`);
      
      if (finalData.map.nodes?.length > 0) {
        console.log('   Node titles:');
        finalData.map.nodes.forEach((node, index) => {
          console.log(`     ${index + 1}. ${node.title}`);
        });
      }
    } else {
      console.log('⚠️  Final verification failed');
    }
    
    console.log('\n🎉 Complete flow test finished!');
    console.log(`🔗 View the generated map at: http://localhost:3000/cognitive-maps/${map.id}`);
    console.log(`📄 View the source document at: http://localhost:3000/documents/${document.id}`);
    
    return {
      documentId: document.id,
      mapId: map.id,
      success: nodesResponse.ok,
      nodeCount: nodesData.nodes?.length || 0,
      connectionCount: nodesData.connections?.length || 0
    };
    
  } catch (error) {
    console.error('❌ Complete flow test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return null;
  }
}

// Run the test
testCompleteFlow().then(result => {
  if (result) {
    console.log('\n📊 Test Summary:');
    console.log(`   Document ID: ${result.documentId}`);
    console.log(`   Map ID: ${result.mapId}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Nodes Created: ${result.nodeCount}`);
    console.log(`   Connections Created: ${result.connectionCount}`);
  }
});