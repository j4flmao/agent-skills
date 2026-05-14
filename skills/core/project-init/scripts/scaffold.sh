#!/bin/bash
# scaffold.sh — Project structure scaffolding script
# Usage: ./scaffold.sh --stack nestjs|golang|rust|fastapi|django|spring [--frontend react|vue|angular] [--name project-name]

set -euo pipefail

PROJECT_NAME="my-app"
STACK=""
FRONTEND=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --stack) STACK="$2"; shift 2 ;;
    --frontend) FRONTEND="$2"; shift 2 ;;
    --name) PROJECT_NAME="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Create common structure
mkdir -p docs/decisions docs/stories docs/specs
create_gitignore() {
  cat > .gitignore << 'EOF'
node_modules/
dist/
build/
.env
*.log
.DS_Store
coverage/
EOF
}

create_readme() {
  cat > README.md << EOF
# $PROJECT_NAME

## Getting Started
\`\`\`bash
# instructions here
\`\`\`
EOF
}

create_gitignore
create_readme

# Stack-specific scaffolding
case $STACK in
  nestjs)
    mkdir -p src/modules src/shared src/config test
    cat > package.json << 'EOF'
{ "name": "'"$PROJECT_NAME"'", "scripts": { "start": "nest start", "dev": "nest start --watch", "build": "nest build", "test": "jest" } }
EOF
    ;;
  golang)
    mkdir -p cmd/server internal/domain internal/application internal/infrastructure internal/config api
    go mod init "github.com/org/$PROJECT_NAME"
    ;;
  rust)
    mkdir -p crates/domain/src crates/application/src crates/infrastructure/src crates/api/src
    cat > Cargo.toml << 'EOF'
[workspace]
members = ["crates/domain", "crates/application", "crates/infrastructure", "crates/api"]
EOF
    ;;
  fastapi)
    mkdir -p src/api/v1/endpoints src/core src/domain src/application/use_cases src/infrastructure/database src/schemas
    cat > requirements.txt << 'EOF'
fastapi>=0.110.0
uvicorn[standard]
sqlalchemy>=2.0
pydantic>=2.0
EOF
    ;;
  django)
    mkdir -p config/settings apps
    ;;
  spring)
    mkdir -p src/main/java/com/project src/main/resources src/test/java/com/project
    ;;
esac

# Frontend scaffolding
case $FRONTEND in
  react)
    mkdir -p src/app src/features src/shared/components src/shared/hooks src/shared/utils src/lib src/assets
    ;;
  vue)
    mkdir -p src/router src/stores src/features src/shared/components src/shared/composables src/assets
    ;;
  angular)
    mkdir -p src/app/features src/app/shared src/app/core src/assets
    ;;
esac

echo "✅ Project '$PROJECT_NAME' scaffolded at ./$PROJECT_NAME"
