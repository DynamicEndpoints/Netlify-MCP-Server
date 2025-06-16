#!/usr/bin/env node

// Test MCP protocol exactly like Smithery would
const { spawn } = require('child_process');
const readline = require('readline');

console.log('🔧 Testing MCP Server for Smithery Compatibility...');

async function testMCPProtocol() {
  return new Promise((resolve, reject) => {
    // Spawn the MCP server process
    const serverProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let responseReceived = false;
    let initializationSent = false;

    // Set up readline to handle JSONRPC communication
    const rl = readline.createInterface({
      input: serverProcess.stdout,
      output: process.stdout,
      terminal: false
    });

    // Handle server output (responses)
    rl.on('line', (line) => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log('📥 Server Response:', JSON.stringify(response, null, 2));

          if (response.id === 1) {
            // Initialization response
            console.log('✅ Initialization successful');
            
            // Now request tools list
            const toolsRequest = {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/list",
              params: {}
            };

            console.log('📤 Requesting tools list...');
            serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');

          } else if (response.id === 2) {
            // Tools list response
            responseReceived = true;
            
            if (response.result && response.result.tools) {
              console.log(`✅ Tools discovered: ${response.result.tools.length} tools`);
              console.log('🛠️ Tool names:', response.result.tools.map(t => t.name).join(', '));
              
              // Test if lazy loading is working (tools should be available without auth)
              if (response.result.tools.length > 0) {
                console.log('✅ Lazy loading working: Tools are discoverable without authentication');
              } else {
                console.log('❌ No tools found - lazy loading may not be working');
              }
            } else {
              console.log('❌ No tools in response:', response);
            }

            // Clean shutdown
            serverProcess.kill();
            resolve(response);
          }
        } catch (error) {
          console.log('📝 Non-JSON output:', line);
        }
      }
    });

    // Handle server errors
    serverProcess.stderr.on('data', (data) => {
      console.log('🔍 Server log:', data.toString().trim());
      
      // Once we see the server is running, send initialization
      if (!initializationSent && data.toString().includes('Netlify MCP Server')) {
        initializationSent = true;
        
        // Send initialization request
        const initRequest = {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {
              roots: {
                listChanged: true
              },
              sampling: {}
            },
            clientInfo: {
              name: "Smithery Compatibility Test",
              version: "1.0.0"
            }
          }
        };

        console.log('📤 Sending initialization...');
        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      }
    });

    // Handle process termination
    serverProcess.on('close', (code) => {
      console.log(`🔚 Server process exited with code ${code}`);
      if (!responseReceived) {
        reject(new Error('No response received'));
      }
    });

    // Handle process errors
    serverProcess.on('error', (error) => {
      console.error('❌ Server process error:', error);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!responseReceived) {
        console.log('⏰ Test timed out');
        serverProcess.kill();
        reject(new Error('Test timed out'));
      }
    }, 10000);
  });
}

async function main() {
  try {
    await testMCPProtocol();
    console.log('\n🎉 Smithery compatibility test completed successfully!');
    console.log('✅ The server should work correctly in Smithery');
  } catch (error) {
    console.error('\n❌ Smithery compatibility test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
