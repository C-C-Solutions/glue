#!/usr/bin/env node

/**
 * LocalStack S3 Connector Test Script
 * Tests the S3 connector with LocalStack
 */

import { S3Connector } from "../packages/core/dist/connectors/s3.connector.js";

const testS3Connector = async () => {
  console.log("🧪 Starting LocalStack S3 Connector Test...\n");

  const connector = new S3Connector();

  const config = {
    region: process.env.AWS_DEFAULT_REGION || "us-east-1",
    bucket: process.env.S3_BUCKET || "glue-test-bucket",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:4566",
  };

  console.log("📋 Configuration:");
  console.log(JSON.stringify({ ...config, secretAccessKey: "***" }, null, 2));
  console.log("");

  const testId = Math.random().toString(36).substring(7);
  const testKey = `test-data/test-${testId}.json`;
  const testContent = JSON.stringify({
    message: "Hello from LocalStack!",
    timestamp: new Date().toISOString(),
    testId: testId,
  });

  try {
    // Test 1: PUT Object
    console.log("📤 Test 1: PUT Object");
    const putResult = await connector.execute(config, {
      action: "putObject",
      key: testKey,
      content: testContent,
      contentType: "application/json",
    });

    if (!putResult.success) {
      console.error("❌ PUT Object failed:", putResult.error);
      process.exit(1);
    }

    console.log("✅ PUT Object succeeded");
    console.log("   ETag:", putResult.data.etag);
    console.log("");

    // Test 2: LIST Objects
    console.log("📋 Test 2: LIST Objects");
    const listResult = await connector.execute(config, {
      action: "listObjects",
      prefix: "test-data/",
      maxKeys: 10,
    });

    if (!listResult.success) {
      console.error("❌ LIST Objects failed:", listResult.error);
      process.exit(1);
    }

    console.log("✅ LIST Objects succeeded");
    console.log(`   Found ${listResult.data.keyCount} objects`);
    console.log(
      "   Keys:",
      listResult.data.objects.map((o) => o.key).join(", ")
    );
    console.log("");

    // Test 3: GET Object
    console.log("📥 Test 3: GET Object");
    const getResult = await connector.execute(config, {
      action: "getObject",
      key: testKey,
    });

    if (!getResult.success) {
      console.error("❌ GET Object failed:", getResult.error);
      process.exit(1);
    }

    console.log("✅ GET Object succeeded");
    console.log("   Content Type:", getResult.data.contentType);
    console.log("   Content Length:", getResult.data.contentLength);

    // Verify content
    const retrievedContent = JSON.parse(getResult.data.content);
    const originalContent = JSON.parse(testContent);

    if (retrievedContent.testId === originalContent.testId) {
      console.log("✅ Content verified - testId matches!");
    } else {
      console.error("❌ Content verification failed - testId mismatch");
      process.exit(1);
    }

    console.log("");
    console.log("🎉 All tests passed! LocalStack S3 connector is working correctly.");
    console.log("");
    console.log("✨ Summary:");
    console.log("   - ✅ PUT Object");
    console.log("   - ✅ LIST Objects");
    console.log("   - ✅ GET Object");
    console.log("   - ✅ Data verification");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    process.exit(1);
  }
};

// Run the test
testS3Connector();
