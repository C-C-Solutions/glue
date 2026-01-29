#!/bin/bash
set -e

# LocalStack S3 Setup Script
# This script initializes the S3 bucket in LocalStack for testing

echo "🚀 Setting up LocalStack S3 bucket..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
until curl -s http://localhost:4566/_localstack/health | grep -q '"s3": "available"'; do
  echo "   Waiting for LocalStack S3 service..."
  sleep 2
done

echo "✅ LocalStack is ready!"

# Set AWS credentials for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566

# Bucket name from environment or default
BUCKET_NAME=${S3_BUCKET:-glue-test-bucket}

echo "📦 Creating S3 bucket: $BUCKET_NAME"

# Create S3 bucket using AWS CLI
aws --endpoint-url=http://localhost:4566 s3 mb s3://$BUCKET_NAME 2>/dev/null || echo "   Bucket already exists or error creating"

# Verify bucket exists
if aws --endpoint-url=http://localhost:4566 s3 ls | grep -q $BUCKET_NAME; then
  echo "✅ Bucket '$BUCKET_NAME' is ready!"
else
  echo "❌ Failed to create or verify bucket '$BUCKET_NAME'"
  exit 1
fi

# List all buckets
echo "📋 Available S3 buckets:"
aws --endpoint-url=http://localhost:4566 s3 ls

echo ""
echo "✨ LocalStack S3 setup complete!"
echo ""
echo "You can now test S3 operations with:"
echo "  - Endpoint: http://localhost:4566"
echo "  - Bucket: $BUCKET_NAME"
echo "  - Region: us-east-1"
echo "  - Access Key: test"
echo "  - Secret Key: test"
