# Jenkins Pipeline Reference

## Parallel Stages

```groovy
stage('Test Matrix') {
    parallel {
        stage('Unit Tests') {
            steps { sh 'npm run test:unit' }
        }
        stage('Integration Tests') {
            steps { sh 'npm run test:integration' }
        }
        stage('Lint') {
            steps { sh 'npm run lint' }
        }
    }
}
```

## Error Handling

```groovy
stage('Deploy') {
    steps {
        retry(3) {
            sh 'helm upgrade --install ... --wait --timeout 5m'
        }
    }
}
```
