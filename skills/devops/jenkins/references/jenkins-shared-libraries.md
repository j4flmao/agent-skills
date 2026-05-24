# Jenkins Shared Libraries

## Repository Structure

```
shared-library/
├── vars/
│   ├── dockerBuild.groovy
│   ├── k8sDeploy.groovy
│   ├── runTests.groovy
│   ├── gitCheckout.groovy
│   └── sendNotification.groovy
├── src/
│   └── org/
│       └── mycompany/
│           ├── DockerTools.groovy
│           ├── K8sTools.groovy
│           └── NotificationTools.groovy
├── resources/
│   ├── org/
│   │   └── mycompany/
│   │       └── templates/
│   │           └── deployment.yaml
│   └── sonar-project.properties
├── test/
│   ├── vars/
│   │   └── dockerBuildTest.groovy
│   └── resources/
├── Jenkinsfile
└── README.md
```

## Loading Shared Library

```groovy
// Jenkinsfile — load from SCM
@Library('my-shared-library@main') _

// Or with specific version
@Library('my-shared-library@v2.3.1') _

// Multiple libraries
@Library(['lib-one@main', 'lib-two@main']) _
```

## Global Variable (vars/)

```groovy
// vars/dockerBuild.groovy
def call(Map config) {
    stage('Docker Build') {
        def imageName = config.imageName ?: env.APP_NAME
        def tag = config.tag ?: env.BUILD_NUMBER

        echo "Building Docker image: ${imageName}:${tag}"
        sh """
            docker build -t ${imageName}:${tag} .
            docker tag ${imageName}:${tag} ${config.registry}/${imageName}:${tag}
        """

        if (config.push) {
            sh "docker push ${config.registry}/${imageName}:${tag}"
        }

        return "${config.registry}/${imageName}:${tag}"
    }
}
```

## Class Library (src/)

```groovy
// src/org/mycompany/K8sTools.groovy
package org.mycompany

class K8sTools implements Serializable {
    private final Script script

    K8sTools(Script script) {
        this.script = script
    }

    String getCurrentNamespace() {
        return script.sh(
            script: 'kubectl config view --minify --output jsonpath={..namespace}',
            returnStdout: true
        ).trim()
    }

    def rolloutStatus(String deployment, String namespace) {
        script.sh "kubectl rollout status deployment/${deployment} -n ${namespace} --timeout=300s"
    }

    def canaryDeploy(String imageTag, int weight = 20) {
        script.sh """
            kubectl set image deployment/myapp-v2 myapp=myapp:${imageTag}
            kubectl scale deployment/myapp-v2 --replicas=\$(
                kubectl get deployment/myapp -o jsonpath='{.spec.replicas}'
            )
        """
    }
}
```

## Testing Shared Libraries

```groovy
// test/vars/dockerBuildTest.groovy
import org.junit.*
import static org.junit.Assert.*

class DockerBuildTest {
    @Test
    void testDockerBuildWithDefaultTag() {
        def script = new DockerBuild()
        def result = script.call(imageName: 'myapp', registry: 'docker.io/myorg')

        assertNotNull(result)
        assertTrue(result.contains('myapp:'))
    }

    @Test
    void testDockerBuildWithCustomTag() {
        def script = new DockerBuild()
        def result = script.call(
            imageName: 'myapp',
            registry: 'docker.io/myorg',
            tag: 'v1.0.0'
        )
        assertTrue(result.contains('v1.0.0'))
    }
}
```

## Best Practices

- Version pin libraries with Git tags (v1.0.0, v2.0.0)
- Use `@NonCPS` annotation for methods using non-serializable objects
- Keep global variables (vars/) stateless and idempotent
- Complex logic goes in src/ classes, vars/ is thin wrappers
- Test shared libraries with JenkinsPipelineUnit
- Document all parameters with `@param` annotation
- Catch and handle errors in library code (not in Jenkinsfile)
- Avoid `input` step in library code (breaks automation)
- Use `withCredentials` for secrets, never pass as parameters
