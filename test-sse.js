#!/usr/bin/env node

// Test SSE transport functionality
const http = require('http');

const SSE_PORT = process.env.MCP_SSE_PORT || 3000;
const BASE_URL = `http://localhost:${SSE_PORT}`;

console.log('Testing Netlify MCP Server SSE Transport...');
console.log(`Base URL: ${BASE_URL}`);

async function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}`;
    console.log(`\nTesting ${description}: ${url}`);
    
    const req = http.get(url, (res) => {
      console.log(`  Status: ${res.statusCode}`);
      console.log(`  Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });
    
    req.on('error', (error) => {
      console.log(`  Error: ${error.message}`);
      resolve({ error: error.message });
    });
    
    req.setTimeout(5000, () => {
      console.log('  Timeout: Request timed out after 5 seconds');
      req.destroy();
      resolve({ error: 'Timeout' });
    });
  });
}

async function testSSEConnection() {
  return new Promise((resolve) => {
    console.log(`\nTesting SSE Connection: ${BASE_URL}/mcp`);
    
    const req = http.get(`${BASE_URL}/mcp`, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
    }, (res) => {
      console.log(`  Status: ${res.statusCode}`);
      console.log(`  Headers:`, res.headers);
      
      if (res.statusCode === 200) {
        let eventCount = 0;
        res.on('data', (chunk) => {
          eventCount++;
          const data = chunk.toString();
          console.log(`  SSE Event ${eventCount}: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
          
          if (eventCount >= 3) {
            req.destroy();
            resolve({ success: true, eventCount });
          }
        });
      }
      
      setTimeout(() => {
        req.destroy();
        resolve({ success: res.statusCode === 200, eventCount });
      }, 3000);
    });
    
    req.on('error', (error) => {
      console.log(`  Error: ${error.message}`);
      resolve({ error: error.message });
    });
  });
}

async function main() {
  try {
    // Test health endpoint
    await testEndpoint('/health', 'Health Check');
    
    // Test stats endpoint
    await testEndpoint('/stats', 'Statistics');
    
    // Test MCP SSE endpoint
    await testEndpoint('/mcp', 'MCP SSE Endpoint');
    
    // Test SSE connection
    await testSSEConnection();
    
    console.log('\n✅ SSE transport test completed');
    
  } catch (error) {
    console.error('\n❌ SSE transport test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testEndpoint, testSSEConnection };
