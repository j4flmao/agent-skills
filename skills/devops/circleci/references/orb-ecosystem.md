# CircleCI Orb Ecosystem

## Overview

Orbs are reusable configuration packages that simplify CircleCI setup. They encapsulate jobs, commands, and executors for common tools and services. The orb registry hosts hundreds of certified and community orbs.

## Using Pre-Built Orbs

### Orb Registry
Orbs are published on the [CircleCI Orb Registry](https://circleci.com/developer/orbs).

### Importing Orbs
```yaml
version: 2.1

orbs:
  node: circleci/node@5.2.0
  docker: circleci/docker@2.5.0
  aws-cli: circleci/aws-cli@3.1.4
  aws-eks: circleci/aws-eks@2.2.2
  slack: circleci/slack@4.12.5
  sonarcloud: sonarsource/sonarcloud@2.0.0
  codecov: codecov/codecov@3.3.0
  browser-tools: circleci/browser-tools@1.4.6
  heroku: circleci/heroku@1.2.6
```

### Using Orb Commands
```yaml
orbs:
  node: circleci/node@5.2.0
  slack: circleci/slack@4.12.5

jobs:
  build:
    docker:
      - image: cimg/node:20.12
    steps:
      - checkout
      - node/install-packages:
          with-cache: true
          pkg-manager: npm
      - run: npm run build:ci
      - run: npm test
      - slack/notify:
          event: fail
          template: basic_fail_1
```

### Using Orb Jobs
```yaml
orbs:
  aws-eks: circleci/aws-eks@2.2.2

workflows:
  deploy:
    jobs:
      - aws-eks/update-container-image:
          cluster-name: my-cluster
          container-image-updates: "app=my-app:${CIRCLE_SHA1}"
          namespace: production
          region: us-east-1
          aws-profile: eks-admin
```

## Popular Orbs

### Node.js Orb
```yaml
orbs:
  node: circleci/node@5.2.0

jobs:
  test:
    executor:
      name: node/default
      tag: "20.12"
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
          cache-version: v2
          include-branch-in-cache-key: false
          override-ci-command: npm ci --prefer-offline
      - run: npm run lint
      - run: npm run test:ci
      - node/run-tests:
          test-results-for: mocha
          test-results-path: test-results
```

### Docker Orb
```yaml
orbs:
  docker: circleci/docker@2.5.0

jobs:
  publish:
    executor: docker/docker
    steps:
      - checkout
      - setup_remote_docker:
          docker_layer_caching: true
      - docker/check:
          docker-username: $DOCKER_USER
          docker-password: $DOCKER_PASS
      - docker/build:
          image: myorg/myapp
          tag: ${CIRCLE_SHA1},latest
          extra-build-args: --build-arg VERSION=$CIRCLE_TAG
      - docker/push:
          image: myorg/myapp
          tag: ${CIRCLE_SHA1}
```

### AWS CLI Orb
```yaml
orbs:
  aws-cli: circleci/aws-cli@3.1.4

jobs:
  deploy:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - aws-cli/setup:
          aws-access-key-id: AWS_ACCESS_KEY_ID
          aws-secret-access-key: AWS_SECRET_ACCESS_KEY
          aws-region: AWS_DEFAULT_REGION
      - run: aws s3 sync ./dist s3://my-bucket/ --delete
```

## Creating Custom Orbs

### Orb Structure
```
my-orb/
├── @orb.yml           # Orb metadata
├── commands/          # Command definitions
│   ├── greet.yml
│   └── deploy.yml
├── executors/         # Executor definitions
│   └── default.yml
├── jobs/              # Job definitions
│   └── build.yml
└── examples/          # Usage examples
    └── example.yml
```

### Orb Metadata
```yaml
# @orb.yml
version: 2.1

display:
  home_url: "https://github.com/myorg/my-orb"
  source_url: "https://github.com/myorg/my-orb"

orbs:
  node: circleci/node@5.2.0
```

### Command Orb
```yaml
# commands/hello.yml
description: >
  A simple greeting command that prints a hello message.

parameters:
  to:
    type: string
    default: "World"
    description: "Who to greet"

steps:
  - run:
      name: Hello << parameters.to >>
      command: echo "Hello << parameters.to >>!"
```

### Executor Orb
```yaml
# executors/default.yml
description: >
  Standard Node.js executor with PostGIS

docker:
  - image: cimg/node:20.12
  - image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: circleci
      POSTGRES_DB: circle_test
      POSTGRES_PASSWORD: ""
      POSTGRES_HOST_AUTH_METHOD: trust

resource_class: medium

working_directory: ~/project
```

### Job Orb
```yaml
# jobs/build.yml
description: >
  Build and test a Node.js application with caching.

parameters:
  node-version:
    type: string
    default: "20.12"
  pkg-manager:
    type: enum
    enum: ["npm", "yarn"]
    default: "npm"

docker:
  - image: cimg/node:<< parameters.node-version >>

steps:
  - checkout
  - run:
      name: Install dependencies
      command: |
        if [ "<< parameters.pkg-manager >>" = "npm" ]; then
          npm ci
        else
          yarn install --frozen-lockfile
        fi
  - run:
      name: Build
      command: |
        if [ "<< parameters.pkg-manager >>" = "npm" ]; then
          npm run build
        else
          yarn build
        fi
  - run:
      name: Test
      command: |
        if [ "<< parameters.pkg-manager >>" = "npm" ]; then
          npm test
        else
          yarn test
        fi
```

## Orb Packing

### Development Workflow
```bash
# Clone orb repository
git clone https://github.com/myorg/my-orb
cd my-orb

# Pack the orb (validates structure)
circleci orb pack src/ > packed.yml

# Validate the orb
circleci orb validate packed.yml

# Create dev version (for testing)
circleci orb publish packed.yml myorg/my-orb@dev:first

# Test in a pipeline
# .circleci/config.yml
orbs:
  my-orb: myorg/my-orb@dev:first
```

### Orb Testing CI
```yaml
# .circleci/config.yml (for orb development)
version: 2.1

setup: true

orbs:
  orb-tools: circleci/orb-tools@12.3.0

filters: &filters
  tags:
    only: /.*/

workflows:
  lint-pack:
    jobs:
      - orb-tools/lint:
          filters: *filters
      - orb-tools/pack:
          filters: *filters
      - orb-tools/review:
          filters: *filters
      - orb-tools/increment:
          filters: *filters
```

## Publishing Orbs

### Manual Publishing
```bash
# Pack and publish
circleci orb pack src/ > packed.yml
circleci orb validate packed.yml

# Publish to registry
circleci orb publish packed.yml myorg/my-orb@1.0.0

# Mark as production
circleci orb publish promote myorg/my-orb@1.0.0 production
```

### CI/CD Publishing
```yaml
# .circleci/config.yml
version: 2.1

orbs:
  orb-tools: circleci/orb-tools@12.3.0

workflows:
  publish:
    jobs:
      - orb-tools/lint:
          filters:
            branches:
              ignore: /.*/
            tags:
              only: /^v\d+\.\d+\.\d+$/

      - orb-tools/pack:
          requires:
            - orb-tools/lint
          filters:
            branches:
              ignore: /.*/
            tags:
              only: /^v\d+\.\d+\.\d+$/

      - orb-tools/publish:
          orb-name: myorg/my-orb
          vcs-type: << pipeline.project.type >>
          pub-type: production
          requires:
            - orb-tools/pack
          filters:
            branches:
              ignore: /.*/
            tags:
              only: /^v\d+\.\d+\.\d+$/

      - orb-tools/trigger:
          filters:
            branches:
              ignore: /.*/
            tags:
              only: /^v\d+\.\d+\.\d+$/
```

## Version Management

### Semantic Versioning
```yaml
# Orb versions follow semver
my-orb@1.0.0  # Initial release
my-orb@1.1.0  # Backward-compatible additions
my-orb@2.0.0  # Breaking changes
```

### Version Pinning
```yaml
# Always pin to a specific version
orbs:
  node: circleci/node@5.2.0      # Specific version
  slack: circleci/slack@4.12.5   # Specific version

# Avoid:
#   circleci/node@volatile       # Unstable
#   circleci/node@dev:latest     # Development version in production
```

## Best Practices

1. **Pin orb versions** — never use `volatile` or development tags in production.
2. **Test dev versions** in a separate pipeline before publishing production.
3. **Keep orbs focused** — one orb per tool or domain (don't create monolithic orbs).
4. **Document all parameters** with descriptions and default values.
5. **Use `display` metadata** for home URL, source URL, and description.
6. **Provide examples** directory with usage examples for each command/job.
7. **Validate packing** with `circleci orb validate` before publishing.
8. **Use `setup: true`** for orb development pipelines to enable orb-tools.
9. **Set resource_class** explicitly in orb jobs for predictable performance.
10. **Review changelogs** before upgrading orbs to major versions.
