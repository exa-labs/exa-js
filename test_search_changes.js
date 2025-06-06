const Exa = require('./dist/index.js');

// Load environment variable for API key
require('dotenv').config();

async function testSearchAndContents() {
  try {
    const exa = new Exa.default(process.env.EXA_API_KEY);
    
    console.log('Testing searchAndContents with your changes...\n');
    
    // Test with context option to see the console.log output
    const response = await exa.searchAndContents("latest AI developments", {
      text: true,
      context: true,
      numResults: 2
    });
    
    console.log('\nResponse received:');
    console.log('Number of results:', response.results.length);
    console.log('Context available:', !!response.context);
    console.log('Request ID:', response.requestId);
    
  } catch (error) {
    console.error('Error testing searchAndContents:', error.message);
  }
}

async function testFindSimilar() {
  try {
    const exa = new Exa.default(process.env.EXA_API_KEY);
    
    console.log('\n--- Testing findSimilar with context option ---\n');
    
    // Test findSimilar with context option
    const response = await exa.findSimilarAndContents("https://openai.com/blog/chatgpt", {
      text: true,
      context: true,
      numResults: 3,
      excludeSourceDomain: true
    });
    
    console.log('\nFindSimilar response received:');
    console.log('Number of results:', response.results.length);
    console.log('Context available:', !!response.context);
    console.log('Request ID:', response.requestId);
    console.log('Sample result:', response.results[0]?.title);
    
  } catch (error) {
    console.error('Error testing findSimilar:', error.message);
  }
}

async function runAllTests() {
  await testSearchAndContents();
  await testFindSimilar();
}

runAllTests(); 