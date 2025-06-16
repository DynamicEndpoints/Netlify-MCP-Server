#!/usr/bin/env node

// Test script to verify MCP server tools are discoverable
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPServer() {
  console.log('🧪 Testing Netlify MCP Server Tool Discovery...\n');
  
  const serverPath = join(__dirname, 'build', 'index.js');
  
  // Start the MCP server
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NETLIFY_AUTH_TOKEN: 'dummy-token-for-testing' }
  });

  let output = '';
  let errorOutput = '';

  server.stdout.on('data', (data) => {
    output += data.toString();
  });

  server.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  // Send list_tools request
  const listToolsRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  };

  console.log('📤 Sending tools/list request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Wait for response
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      const response = data.toString();
      if (response.includes('tools')) {
        try {
          const parsed = JSON.parse(response);
          if (parsed.result && parsed.result.tools) {
            console.log('✅ Tools discovered successfully!');
            console.log(`📊 Found ${parsed.result.tools.length} tools:`);
            parsed.result.tools.forEach((tool, index) => {
              console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
            });
          }
        } catch (e) {
          console.log('📝 Raw response:', response);
        }
        resolve();
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      console.log('⏰ Timeout waiting for response');
      if (errorOutput) {
        console.log('❌ Error output:', errorOutput);
      }
      resolve();
    }, 5000);
  });

  server.kill();
  console.log('\n✅ Test completed!');
}

testMCPServer().catch(console.error);
