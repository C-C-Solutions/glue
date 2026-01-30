# MCP Server Usage Examples

This document provides examples of using the Glue Workflow API through the MCP (Model Context Protocol) server with AI assistants.

## Prerequisites

1. MongoDB and Redis are running
2. MCP server is built and configured in your AI assistant
3. AI assistant (e.g., Claude Desktop) is connected to the MCP server

## Example 1: Creating a Simple HTTP Workflow

Ask your AI assistant:

```
Create a new workflow with ID "fetch-user-data" and version "1.0.0" that fetches user data from the GitHub API. The workflow should have a manual trigger and a single HTTP step that fetches data from https://api.github.com/users/octocat
```

The assistant will use the `create_workflow` tool to create this workflow.

## Example 2: Executing a Workflow

After creating a workflow, execute it:

```
Execute the workflow with ID "fetch-user-data" without any input data
```

The assistant will use the `execute_workflow` tool and return a job ID.

## Example 3: Monitoring Execution Status

Check the status of a job:

```
What's the status of job [job-id]?
```

Or check a specific execution:

```
Get the details of execution [execution-id]
```

## Example 4: Creating a Multi-Step Workflow

Create a more complex workflow:

```
Create a workflow called "data-pipeline" version "1.0.0" with these steps:
1. Fetch user data from GitHub API (https://api.github.com/users/octocat)
2. Transform the data using JavaScript to extract only name and public repos count
3. The JavaScript code should be: return { name: user.name, repos: user.public_repos }; with context user set to the output of step 1
```

## Example 5: Publishing Events

Publish an event to trigger event-based workflows:

```
Publish an event with type "user.created" and data containing userId: 42 and email: test@example.com
```

## Example 6: Listing and Managing Resources

List all workflows:

```
Show me all the workflows in the system
```

List all schedules:

```
What scheduled workflows are registered?
```

List all webhooks:

```
Show me all the webhook endpoints
```

List event triggers:

```
What workflows are listening for events?
```

## Example 7: Creating an Event-Triggered Workflow

```
Create a workflow with ID "handle-user-event" version "1.0.0" that:
- Triggers on events of type "user.created"
- Has a single HTTP step that posts the user data to https://api.example.com/users/welcome
- The HTTP step should send a POST request with the event data
```

## Example 8: Creating a Scheduled Workflow

```
Create a workflow with ID "daily-report" version "1.0.0" that:
- Runs on a schedule at "0 9 * * *" (daily at 9 AM UTC)
- Fetches data from https://api.example.com/metrics
- Sends an email with the results
```

## Example 9: Managing Executions

Cancel a running execution:

```
Cancel the execution with ID [execution-id]
```

List all executions for a workflow:

```
Show me the last 10 executions of the workflow "fetch-user-data"
```

## Example 10: Health Check

Check if the API is healthy:

```
Check the health status of the Glue API
```

## Example 11: Complex Multi-Connector Workflow

```
Create a workflow with ID "data-sync" version "2.0.0" that:
1. Fetches data from a PostgreSQL database with query "SELECT * FROM users WHERE active = true"
2. For each user, calls an OpenAI API to generate a personalized message
3. Sends an email via SMTP to each user with their personalized message
4. Stores the results in an S3 bucket

Use these configurations:
- PostgreSQL: host localhost, port 5432, database mydb, user dbuser, password dbpass
- OpenAI: model gpt-4o, system prompt "Generate a friendly welcome message"
- SMTP: host smtp.gmail.com, port 587, user me@example.com, password mypass
- S3: bucket my-bucket, region us-east-1, endpoint http://localhost:4566
```

## Example 12: Debugging and Monitoring

Get detailed execution information:

```
Show me detailed information about execution [execution-id] including all step outputs and errors
```

Check job queue status:

```
What's the status of job [job-id]? Include the associated execution details.
```

## Tips for AI Assistants

1. **Always validate inputs**: Ensure workflow definitions have required fields (id, name, version, steps)
2. **Handle errors gracefully**: MCP tools return error information in the response
3. **Use proper data types**: Workflow steps need proper connector types and configurations
4. **Chain operations**: Create a workflow, then execute it, then monitor its execution
5. **Provide context**: When asking about executions, provide relevant IDs from previous operations

## Common Patterns

### Pattern 1: Data Pipeline
1. Create workflow with data sources (HTTP, PostgreSQL, S3)
2. Transform data with JavaScript connector
3. Send to destinations (Email, S3, HTTP)

### Pattern 2: Event-Driven Automation
1. Create workflow with event trigger
2. Add conditional logic
3. Execute actions based on event data

### Pattern 3: Scheduled Jobs
1. Create workflow with schedule trigger (cron)
2. Add data processing steps
3. Store or send results

### Pattern 4: Webhook Integration
1. Create workflow with webhook trigger
2. Validate webhook payload
3. Process and respond
