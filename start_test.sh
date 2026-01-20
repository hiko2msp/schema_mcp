#!/bin/bash


cd test_python_project
rm -rf .schema_mcp
schema-mcp install-skills
timeout 300s bash -c 'echo "run schema-mcp skill" | opencode --model "lmstudio/minimax-m2.1@q6_k_xl"'


cd ../test_python_project_v2
rm -rf .schema_mcp
schema-mcp install-skills
cp -r ../test_python_project/.schema_mcp ./.schema_mcp
timeout 300s bash -c 'echo "run schema-mcp skill" | opencode --model "lmstudio/minimax-m2.1@q6_k_xl"'


