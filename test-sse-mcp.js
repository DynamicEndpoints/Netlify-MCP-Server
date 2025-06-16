#!/usr/bin/env node

// Test MCP over SSE with full protocol support
const http = require('http');
const EventSource = require('eventsource'); // Note: this would need to be installed

const SSE_PORT = process.env.MCP_SSE_PORT || 3000;
const BASE_URL = `http://localhost:${SSE_PORT}`;

console.log('Testing MCP Protocol over SSE Transport...');
console.log(`Base URL: ${BASE_URL}`);

class MCPSSEClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.requestId = 1;
  }

  async sendMCPRequest(method, params = {}) {
    const request = {
      jsonrpc: "2.0",
      id: this.requestId++,
      method: method,
      params: params
    };

    console.log(`\nSending MCP Request: ${method}`);
    console.log(`  Request:`, JSON.stringify(request, null, 2));

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(request);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(`${this.baseUrl}/mcp`, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(`  Response:`, JSON.stringify(response, null, 2));
            resolve(response);
          } catch (error) {
            console.log(`  Raw Response: ${data}`);
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        console.log(`  Error: ${error.message}`);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  async initialize() {
    return this.sendMCPRequest('initialize', {
      protocolVersion: "2025-03-26",
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {}
      },
      clientInfo: {
        name: "SSE Test Client",
        version: "1.0.0"
      }
    });
  }

  async listTools() {
    return this.sendMCPRequest('tools/list');
  }

  async listResources() {
    return this.sendMCPRequest('resources/list');
  }

  async listPrompts() {
    return this.sendMCPRequest('prompts/list');
  }

  async callTool(name, args) {
    return this.sendMCPRequest('tools/call', {
      name: name,
      arguments: args
    });
  }
}

async function testMCPProtocol() {
  const client = new MCPSSEClient(BASE_URL);

  try {
    console.log('\n=== Testing MCP Protocol ===');

    // Initialize the MCP session
    console.log('\n1. Initialize MCP Session');
    const initResponse = await client.initialize();
    
    if (initResponse.error) {
      throw new Error(`Initialization failed: ${initResponse.error.message}`);
    }

    // List available tools
    console.log('\n2. List Available Tools');
    const toolsResponse = await client.listTools();
    
    if (toolsResponse.error) {
      throw new Error(`List tools failed: ${toolsResponse.error.message}`);
    }

    const tools = toolsResponse.result?.tools || [];
    console.log(`  Found ${tools.length} tools:`, tools.map(t => t.name));

    // List available resources
    console.log('\n3. List Available Resources');
    const resourcesResponse = await client.listResources();
    
    if (resourcesResponse.error) {
      console.log(`  Warning: List resources failed: ${resourcesResponse.error.message}`);
    } else {
      const resources = resourcesResponse.result?.resources || [];
      console.log(`  Found ${resources.length} resources:`, resources.map(r => r.uri));
    }

    // List available prompts
    console.log('\n4. List Available Prompts');
    const promptsResponse = await client.listPrompts();
    
    if (promptsResponse.error) {
      console.log(`  Warning: List prompts failed: ${promptsResponse.error.message}`);
    } else {
      const prompts = promptsResponse.result?.prompts || [];
      console.log(`  Found ${prompts.length} prompts:`, prompts.map(p => p.name));
    }

    // Test tool invocation (without auth token, should fail gracefully)
    console.log('\n5. Test Tool Invocation (get-status - no auth required for listing)');
    if (tools.find(t => t.name === 'get-status')) {
      const toolResponse = await client.callTool('get-status', {});
      
      if (toolResponse.error) {
        console.log(`  Expected error (no auth token): ${toolResponse.error.message}`);
      } else {
        console.log(`  Unexpected success: Tool executed successfully`);
      }
    } else {
      console.log(`  Skipping: get-status tool not found`);
    }

    console.log('\n✅ MCP protocol test completed successfully');
    return true;

  } catch (error) {
    console.error('\n❌ MCP protocol test failed:', error.message);
    return false;
  }
}

async function main() {
  try {
    // Wait a moment for server to be ready
    console.log('Waiting for SSE server to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const success = await testMCPProtocol();
    
    if (success) {
      console.log('\n🎉 All SSE MCP tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MCPSSEClient, testMCPProtocol };
