#!/usr/bin/env node

// Start the Netlify MCP Server in SSE mode
process.env.MCP_TRANSPORT = 'sse';
process.env.MCP_SSE_PORT = process.env.MCP_SSE_PORT || '3000';

console.log('Starting Netlify MCP Server in SSE mode...');
console.log(`Port: ${process.env.MCP_SSE_PORT}`);
console.log(`Endpoints:`);
console.log(`  - SSE: http://localhost:${process.env.MCP_SSE_PORT}/mcp`);
console.log(`  - WebSocket: ws://localhost:${process.env.MCP_SSE_PORT}/mcp/ws`);
console.log(`  - Health: http://localhost:${process.env.MCP_SSE_PORT}/health`);
console.log(`  - Stats: http://localhost:${process.env.MCP_SSE_PORT}/stats`);
console.log('');

// Import and run the server
require('./build/index.js');
