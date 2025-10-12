// Test memory card generation from document
const fetch = require('node-fetch');

async function testMemoryCardGeneration() {
  console.log('🧪 Testing Memory Card Generation...\n');
  
  try {
    // Step 1: Create a test document
    console.log('📄 Creating test document...');
    const documentResponse = await fetch('http://localhost:3000/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'JavaScript Fundamentals',
        content: `JavaScript is a high-level, interpreted programming language that is widely used for web development.

Variables in JavaScript can be declared using var, let, or const keywords. The let keyword creates block-scoped variables, while const creates immutable references.

Functions are first-class objects in JavaScript, meaning they can be assigned to variables, passed as arguments, and returned from other functions.

JavaScript supports both object-oriented and functional programming paradigms. Objects can be created using object literals, constructor functions, or ES6 classes.

Asynchronous programming in JavaScript is handled through callbacks, promises, and async/await syntax. Promises provide a cleaner way to handle asynchronous operations compared to callbacks.

The Document Object Model (DOM) allows JavaScript to interact with HTML elements on a web page. Event listeners can be attached to elements to respond to user interactions.`,
        tags: ['javascript', 'programming', 'web-development']
      }),
    });
    
    if (!documentResponse.ok) {
      const error = await documentResponse.text();
      console.error('❌ Failed to create document:', error);
      return;
    }
    
    const { document } = await documentResponse.json();
    console.log('✅ Document created:', document.id, '-', document.title);
    console.log('   Content length:', document.content.length);
    
    // Step 2: Generate memory cards from document
    console.log('\n🃏 Generating memory cards from document...');
    const cardsResponse = await fetch('http://localhost:3000/api/ai/generate-memory-cards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: document.id,
        count: 8,
      }),
    });
    
    const cardsData = await cardsResponse.json();
    
    console.log('📊 Memory card generation results:');
    console.log('   HTTP Status:', cardsResponse.status);
    console.log('   Cards created:', cardsData.memoryCards?.length || 0);
    console.log('   Message:', cardsData.message);
    
    if (!cardsResponse.ok) {
      console.error('❌ Memory card generation failed:', cardsData.error);
      return;
    }
    
    console.log('✅ Memory card generation successful!');
    
    if (cardsData.memoryCards && cardsData.memoryCards.length > 0) {
      console.log('\n🃏 Generated Memory Cards:');
      cardsData.memoryCards.forEach((card, index) => {
        console.log(`\n   ${index + 1}. Card ID: ${card.id}`);
        console.log(`      Front: ${card.front}`);
        console.log(`      Back: ${card.back.substring(0, 100)}${card.back.length > 100 ? '...' : ''}`);
        console.log(`      Difficulty: ${card.difficulty}`);
        console.log(`      Tags: ${card.tags?.join(', ') || 'None'}`);
      });
    }
    
    if (cardsData.stats) {
      console.log('\n📈 Generation Stats:');
      console.log(`   Cards Generated: ${cardsData.stats.cardsGenerated}`);
      console.log(`   Source Type: ${cardsData.stats.sourceType}`);
      console.log(`   Average Difficulty: ${cardsData.stats.averageDifficulty?.toFixed(1)}`);
    }
    
    // Step 3: Verify cards match document content
    console.log('\n🔍 Verifying content matching...');
    let contentMatches = 0;
    const documentWords = document.content.toLowerCase().split(/\s+/);
    
    cardsData.memoryCards?.forEach((card, index) => {
      const cardText = (card.front + ' ' + card.back).toLowerCase();
      const cardWords = cardText.split(/\s+/);
      
      // Check if card contains words from the document
      const matchingWords = cardWords.filter(word => 
        word.length > 3 && documentWords.some(docWord => 
          docWord.includes(word) || word.includes(docWord)
        )
      );
      
      if (matchingWords.length > 2) {
        contentMatches++;
        console.log(`   ✅ Card ${index + 1}: Matches document content (${matchingWords.length} matching words)`);
      } else {
        console.log(`   ⚠️  Card ${index + 1}: Limited content match (${matchingWords.length} matching words)`);
      }
    });
    
    const matchPercentage = (contentMatches / (cardsData.memoryCards?.length || 1)) * 100;
    console.log(`\n📊 Content Matching: ${contentMatches}/${cardsData.memoryCards?.length} cards (${matchPercentage.toFixed(1)}%)`);
    
    if (matchPercentage >= 70) {
      console.log('✅ Good content matching - cards are relevant to the document');
    } else if (matchPercentage >= 40) {
      console.log('⚠️  Moderate content matching - some cards may be generic');
    } else {
      console.log('❌ Poor content matching - cards may not be relevant to the document');
    }
    
    console.log('\n🎉 Memory card test completed!');
    
    return {
      documentId: document.id,
      cardsGenerated: cardsData.memoryCards?.length || 0,
      contentMatchPercentage: matchPercentage,
      success: cardsResponse.ok
    };
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return null;
  }
}

// Run the test
testMemoryCardGeneration().then(result => {
  if (result) {
    console.log('\n📊 Test Summary:');
    console.log(`   Document ID: ${result.documentId}`);
    console.log(`   Cards Generated: ${result.cardsGenerated}`);
    console.log(`   Content Match: ${result.contentMatchPercentage.toFixed(1)}%`);
    console.log(`   Success: ${result.success}`);
  }
});