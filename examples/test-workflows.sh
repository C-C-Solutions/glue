#!/usr/bin/env bash
# Test script for example workflows
# This script helps test the example workflows by creating them and optionally executing them

set -e

API_URL="${API_URL:-http://localhost:3000}"
EXAMPLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo "ℹ $1"
}

# Check if API is running
check_api() {
    print_info "Checking API availability at ${API_URL}..."
    if curl -s "${API_URL}/health" > /dev/null 2>&1; then
        print_success "API is running"
        return 0
    else
        print_error "API is not running at ${API_URL}"
        print_info "Start the API with: pnpm dev"
        return 1
    fi
}

# Create a workflow
create_workflow() {
    local file=$1
    local workflow_name=$(basename "$file" .json)
    
    print_info "Creating workflow from ${workflow_name}..."
    
    response=$(curl -s -X POST "${API_URL}/workflows" \
        -H "Content-Type: application/json" \
        -d @"${file}" \
        -w "\n%{http_code}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        print_success "Created workflow: ${workflow_name}"
        return 0
    else
        print_error "Failed to create workflow: ${workflow_name} (HTTP ${http_code})"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Execute a workflow
execute_workflow() {
    local workflow_id=$1
    local input=${2:-'{}'}
    
    print_info "Executing workflow: ${workflow_id}..."
    
    response=$(curl -s -X POST "${API_URL}/workflows/${workflow_id}/execute" \
        -H "Content-Type: application/json" \
        -d "${input}" \
        -w "\n%{http_code}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "202" ] || [ "$http_code" = "200" ]; then
        job_id=$(echo "$body" | jq -r '.jobId')
        print_success "Workflow queued with job ID: ${job_id}"
        echo "$job_id"
        return 0
    else
        print_error "Failed to execute workflow: ${workflow_id} (HTTP ${http_code})"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Check job status
check_job() {
    local job_id=$1
    
    print_info "Checking job status: ${job_id}..."
    
    response=$(curl -s "${API_URL}/jobs/${job_id}")
    
    job_state=$(echo "$response" | jq -r '.jobState')
    execution_id=$(echo "$response" | jq -r '.executionId')
    
    print_info "Job state: ${job_state}"
    
    if [ "$execution_id" != "null" ] && [ -n "$execution_id" ]; then
        print_info "Execution ID: ${execution_id}"
        
        # Get execution details
        execution=$(curl -s "${API_URL}/executions/${execution_id}")
        status=$(echo "$execution" | jq -r '.status')
        
        print_info "Execution status: ${status}"
        
        if [ "$status" = "completed" ]; then
            print_success "Workflow completed successfully"
            return 0
        elif [ "$status" = "failed" ]; then
            print_error "Workflow execution failed"
            echo "$execution" | jq '.error' 2>/dev/null
            return 1
        else
            print_warning "Workflow execution in progress: ${status}"
            return 2
        fi
    else
        print_warning "Execution not yet available"
        return 2
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "==================================="
    echo "  Example Workflow Testing Menu"
    echo "==================================="
    echo ""
    echo "1. Test simple HTTP example (01-simple-http.json)"
    echo "2. Test HTTP + JavaScript example (02-http-with-javascript.json)"
    echo "3. Test all individual examples (01-07)"
    echo "4. Test comprehensive workflow (08-all-connectors-complete.json)"
    echo "5. Create all workflows (without executing)"
    echo "6. List all workflows"
    echo "7. Custom: Create and execute specific workflow"
    echo "8. Exit"
    echo ""
}

# Test individual workflow
test_individual() {
    local file=$1
    local input=${2:-'{}'}
    
    if [ ! -f "$file" ]; then
        print_error "File not found: $file"
        return 1
    fi
    
    # Create workflow
    if ! create_workflow "$file"; then
        return 1
    fi
    
    # Get workflow ID from file
    workflow_id=$(jq -r '.id' "$file")
    
    # Execute workflow
    if ! job_id=$(execute_workflow "$workflow_id" "$input"); then
        return 1
    fi
    
    # Wait a bit and check status
    sleep 3
    check_job "$job_id" || true
    
    print_info "You can check the job status later with:"
    echo "  curl ${API_URL}/jobs/${job_id} | jq"
}

# List all workflows
list_workflows() {
    print_info "Fetching all workflows..."
    response=$(curl -s "${API_URL}/workflows")
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
}

# Interactive mode
interactive_mode() {
    while true; do
        show_menu
        read -p "Select an option (1-8): " choice
        
        case $choice in
            1)
                test_individual "${EXAMPLE_DIR}/01-simple-http.json"
                ;;
            2)
                test_individual "${EXAMPLE_DIR}/02-http-with-javascript.json"
                ;;
            3)
                for i in {1..7}; do
                    file="${EXAMPLE_DIR}/0${i}-"*.json
                    if [ -f "$file" ]; then
                        test_individual "$file"
                        sleep 2
                    fi
                done
                ;;
            4)
                read -p "Enter userId (default: 1): " user_id
                user_id=${user_id:-1}
                read -p "Enter notification email: " email
                input="{\"userId\": ${user_id}, \"notificationEmail\": \"${email}\"}"
                test_individual "${EXAMPLE_DIR}/08-all-connectors-complete.json" "$input"
                ;;
            5)
                for file in "${EXAMPLE_DIR}/"*.json; do
                    [ -f "$file" ] && create_workflow "$file"
                done
                ;;
            6)
                list_workflows
                ;;
            7)
                read -p "Enter workflow file path: " file_path
                read -p "Enter input JSON (or press Enter for {}): " input_json
                input_json=${input_json:-'{}'}
                test_individual "$file_path" "$input_json"
                ;;
            8)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Main
main() {
    echo "Example Workflow Testing Tool"
    echo "=============================="
    echo ""
    
    if ! check_api; then
        exit 1
    fi
    
    # Check for command line arguments
    if [ $# -eq 0 ]; then
        # No arguments, run interactive mode
        interactive_mode
    else
        # Arguments provided, run specific test
        case "$1" in
            create)
                shift
                for file in "$@"; do
                    create_workflow "$file"
                done
                ;;
            execute)
                workflow_id=$2
                input=${3:-'{}'}
                execute_workflow "$workflow_id" "$input"
                ;;
            test)
                shift
                for file in "$@"; do
                    test_individual "$file"
                done
                ;;
            list)
                list_workflows
                ;;
            *)
                echo "Usage: $0 [create|execute|test|list] [args...]"
                echo ""
                echo "Commands:"
                echo "  create <file> [<file>...]    Create workflow(s) from JSON file(s)"
                echo "  execute <id> [<input>]       Execute workflow by ID"
                echo "  test <file> [<file>...]      Create and execute workflow(s)"
                echo "  list                         List all workflows"
                echo ""
                echo "Or run without arguments for interactive mode"
                exit 1
                ;;
        esac
    fi
}

main "$@"
