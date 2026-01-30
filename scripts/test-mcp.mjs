#!/usr/bin/env node

/**
 * Simple test script to verify MCP server can list tools
 * This sends a tools/list request via stdin and reads the response
 */

import { spawn } from "child_process";
import path from "path";

const mcpServerPath = path.join(
  process.cwd(),
  "apps/api/dist/mcp-server.js",
);

console.log("Testing MCP Server...");
console.log(`MCP Server path: ${mcpServerPath}\n`);

// Mock environment variables for testing
const env = {
  ...process.env,
  MONGODB_URI: "mongodb://localhost:27017/glue-test",
  REDIS_URL: "redis://localhost:6379",
  NODE_ENV: "test",
};

// Spawn the MCP server process
const mcpServer = spawn("node", [mcpServerPath], {
  env,
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

mcpServer.stdout.on("data", (data) => {
  stdout += data.toString();
});

mcpServer.stderr.on("data", (data) => {
  stderr += data.toString();
  // Log stderr in real-time for debugging
  process.stderr.write(data);
});

// Send tools/list request
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {},
};

console.log("Sending request:");
console.log(JSON.stringify(request, null, 2));
console.log("");

mcpServer.stdin.write(JSON.stringify(request) + "\n");

// Wait for response
setTimeout(() => {
  console.log("\n=== Test Results ===");
  
  if (stderr) {
    console.log("\nServer stderr output:");
    console.log(stderr);
  }
  
  if (stdout) {
    console.log("\nServer stdout output (responses):");
    console.log(stdout);
    
    try {
      // Try to parse JSON responses
      const lines = stdout.trim().split("\n");
      lines.forEach((line, idx) => {
        try {
          const response = JSON.parse(line);
          console.log(`\nParsed response ${idx + 1}:`);
          console.log(JSON.stringify(response, null, 2));
          
          if (response.result?.tools) {
            console.log(`\n✅ Success! Found ${response.result.tools.length} MCP tools:`);
            response.result.tools.forEach((tool) => {
              console.log(`  - ${tool.name}: ${tool.description}`);
            });
          }
        } catch (e) {
          console.log(`Line ${idx + 1} (not JSON): ${line}`);
        }
      });
    } catch (error) {
      console.log("Could not parse response as JSON");
    }
  } else {
    console.log("⚠️  No stdout output received");
  }
  
  // Kill the process
  mcpServer.kill();
  process.exit(stdout ? 0 : 1);
}, 5000); // Wait 5 seconds for response

// Handle process errors
mcpServer.on("error", (error) => {
  console.error("❌ Failed to start MCP server:", error);
  process.exit(1);
});

mcpServer.on("exit", (code) => {
  if (code !== null && code !== 0) {
    console.error(`❌ MCP server exited with code ${code}`);
  }
});
