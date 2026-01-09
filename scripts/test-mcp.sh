#!/bin/bash
# Test script for MCP server with a project

set -e

PROJECT_PATH="${1:-./test_python_project}"
SERVER_CMD="/Users/yokotanaohiko/.nodebrew/current/bin/schema-mcp"

echo "Starting MCP server with project: $PROJECT_PATH"
echo ""

$SERVER_CMD "$PROJECT_path" &
SERVER_PID=$!

sleep 2

trap "kill $SERVER_PID 2>/dev/null" EXIT

echo "Testing MCP tools..."
echo ""

# Test list_catalog
echo "=== list_catalog ==="
CATALOG_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_catalog"}}' | timeout 5 $SERVER_CMD "$PROJECT_PATH" 2>&1 | grep -v "Method not found" | tail -1)
echo "$CATALOG_RESULT"
CATALOG=$(echo "$CATALOG_RESULT" | jq -r '.result.content[0].text | fromjson | .[0]' 2>/dev/null || echo "")
echo ""

# Test list_schema
if [ -n "$CATALOG" ] && [ "$CATALOG" != "null" ]; then
    echo "=== list_schema (catalog: $CATALOG) ==="
    SCHEMA_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_schema","arguments":{"catalog":"'$CATALOG'"}}}' | timeout 5 $SERVER_CMD "$PROJECT_PATH" 2>&1 | grep -v "Method not found" | tail -1)
    echo "$SCHEMA_RESULT"
    SCHEMA=$(echo "$SCHEMA_RESULT" | jq -r '.result.content[0].text | fromjson | .[0]' 2>/dev/null || echo "")
    echo ""

    # Test list_tables
    if [ -n "$SCHEMA" ] && [ "$SCHEMA" != "null" ]; then
        echo "=== list_tables (catalog: $CATALOG, schema: $SCHEMA) ==="
        TABLES_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_tables","arguments":{"catalog":"'$CATALOG'","schema":"'$SCHEMA'"}}}' | timeout 5 $SERVER_CMD "$PROJECT_PATH" 2>&1 | grep -v "Method not found" | tail -1)
        echo "$TABLES_RESULT" | jq '.result.content[0].text | fromjson | .[] | {name, description}' 2>/dev/null || echo "(no tables)"
        echo ""
    fi
fi

# Test search_tables
echo "=== search_tables (query: user) ==="
SEARCH_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_tables","arguments":{"catalog":"'$CATALOG'","query":"user"}}}' | timeout 5 $SERVER_CMD "$PROJECT_PATH" 2>&1 | grep -v "Method not found" | tail -1)
echo "$SEARCH_RESULT" | jq '.result.content[0].text | fromjson | .[] | {name, description}' 2>/dev/null || echo "(no results)"
echo ""

# Test get_table_schema
if [ -n "$CATALOG" ] && [ -n "$SCHEMA" ]; then
    echo "=== get_table_schema (catalog: $CATALOG, schema: $SCHEMA, table: user_clicks) ==="
    TABLE_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_table_schema","arguments":{"catalog":"'$CATALOG'","schema":"'$SCHEMA'","table":"user_clicks"}}}' | timeout 5 $SERVER_CMD "$PROJECT_PATH" 2>&1 | grep -v "Method not found" | tail -1)
    echo "$TABLE_RESULT" | jq '.result.content[0].text | fromjson | {name, description, columns: [.columns[].name]}' 2>/dev/null || echo "(not found)"
    echo ""
fi

kill $SERVER_PID 2>/dev/null

echo "Done!"