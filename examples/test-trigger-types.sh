#!/bin/bash

# Trigger Types Testing Script
# This script demonstrates how to work with webhook, scheduled, and event triggers

set -e

API_URL="${API_URL:-http://localhost:3000}"

echo "=========================================="
echo "Testing Webhook, Schedule, and Event Triggers"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Create a webhook-triggered workflow
echo -e "${BLUE}1. Creating webhook-triggered workflow...${NC}"
curl -X POST "$API_URL/workflows" \
  -H "Content-Type: application/json" \
  -d @examples/09-webhook-github-push.json
echo -e "\n${GREEN}✓ Webhook workflow created${NC}\n"
sleep 1

# 2. List registered webhooks
echo -e "${BLUE}2. Listing registered webhooks...${NC}"
curl -X GET "$API_URL/webhooks"
echo -e "\n${GREEN}✓ Webhooks listed${NC}\n"
sleep 1

# 3. Trigger the webhook
echo -e "${BLUE}3. Triggering webhook with sample GitHub push payload...${NC}"
curl -X POST "$API_URL/webhooks/github/push" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: test-signature" \
  -d '{
    "repository": {
      "name": "test-repo"
    },
    "head_commit": {
      "id": "abc123def456789",
      "author": {
        "name": "John Doe"
      },
      "message": "Fix bug in authentication"
    }
  }'
echo -e "\n${GREEN}✓ Webhook triggered${NC}\n"
sleep 1

# 4. Create a scheduled workflow
echo -e "${BLUE}4. Creating scheduled workflow (daily at 8 AM)...${NC}"
curl -X POST "$API_URL/workflows" \
  -H "Content-Type: application/json" \
  -d @examples/10-scheduled-daily-report.json
echo -e "\n${GREEN}✓ Scheduled workflow created${NC}\n"
sleep 1

# 5. List registered schedules
echo -e "${BLUE}5. Listing registered schedules...${NC}"
curl -X GET "$API_URL/schedules"
echo -e "\n${GREEN}✓ Schedules listed${NC}\n"
sleep 1

# 6. Create an event-triggered workflow
echo -e "${BLUE}6. Creating event-triggered workflow...${NC}"
curl -X POST "$API_URL/workflows" \
  -H "Content-Type: application/json" \
  -d @examples/11-event-user-created.json
echo -e "\n${GREEN}✓ Event workflow created${NC}\n"
sleep 1

# 7. List registered event triggers
echo -e "${BLUE}7. Listing registered event triggers...${NC}"
curl -X GET "$API_URL/events/triggers"
echo -e "\n${GREEN}✓ Event triggers listed${NC}\n"
sleep 1

# 8. Publish an event
echo -e "${BLUE}8. Publishing a user.created event...${NC}"
curl -X POST "$API_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "user.created",
    "source": "auth-service",
    "data": {
      "id": "user-123",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-20T10:00:00Z"
    }
  }'
echo -e "\n${GREEN}✓ Event published${NC}\n"
sleep 1

# 9. List all workflows
echo -e "${BLUE}9. Listing all workflows...${NC}"
curl -X GET "$API_URL/workflows"
echo -e "\n${GREEN}✓ All workflows listed${NC}\n"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ All trigger types tested successfully!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Note:${NC}"
echo "- Webhook workflows are triggered by HTTP requests to /webhooks/<path>"
echo "- Scheduled workflows run automatically based on their cron expression"
echo "- Event workflows are triggered when events are published to /events"
echo ""
echo "To monitor workflow executions:"
echo "  curl $API_URL/workflows/<workflow-id>/executions"
