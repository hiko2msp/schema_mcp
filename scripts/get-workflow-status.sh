#!/bin/bash

# Usage: ./get-workflow-status.sh [PR number]
# If no PR number is provided, it will try to get the PR associated with the current branch

set -e

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
BRANCH=${1:-$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)}

if [ -z "$1" ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    PR_NUMBER=$(gh pr list --head "$CURRENT_BRANCH" --json number -q '.[0].number' 2>/dev/null || echo "")
else
    PR_NUMBER=$1
fi

echo "Repository: $REPO"
if [ -n "$PR_NUMBER" ]; then
    echo "PR: #$PR_NUMBER"
fi
echo ""

WORKFLOW_RUNS=$(gh run list --workflow schema-mcp.yml --limit 10 --json status,conclusion,name,databaseId,createdAt,headBranch -q '.')

if [ -z "$WORKFLOW_RUNS" ] || [ "$WORKFLOW_RUNS" == "[]" ]; then
    echo "No workflow runs found for schema-mcp.yml"
    exit 0
fi

echo "Recent workflow runs for schema-mcp.yml:"
echo ""
gh run list --workflow schema-mcp.yml --limit 5

echo ""
echo "Latest run details:"
LATEST_RUN=$(gh run list --workflow schema-mcp.yml --limit 1 --json databaseId -q '.[0].databaseId')

if [ -n "$LATEST_RUN" ]; then
    echo ""
    echo "=== Run $LATEST_RUN ==="
    gh run view "$LATEST_RUN" --json steps,name,status,conclusion,headBranch,createdAt,updatedAt

    echo ""
    echo "=== Job steps ==="
    gh run view "$LATEST_RUN" --json steps --jq '.steps[] | select(.status != "completed") | {name: .name, status: .status, conclusion: .conclusion}'
fi
