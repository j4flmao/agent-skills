# Jest Custom Reporters

## Overview
Jest reporters output test results in various formats. Custom reporters extend Jest's reporting capabilities for custom dashboards, CI integration, notifications, and metrics aggregation.

## Reporter Structure

### Basic Reporter
```typescript
// reporters/custom-reporter.ts
import type {
  AggregatedResult,
  TestResult,
  Reporter,
  ReporterOnStartOptions,
} from '@jest/reporters';

class CustomReporter implements Reporter {
  private results: TestResult[] = [];

  onRunStart(results: AggregatedResult, options: ReporterOnStartOptions) {
    console.log(`Starting test run: ${results.numTotalTestSuites} suites`);
    console.log(`Estimated time: ${options.estimatedTime}s`);
  }

  onTestResult(test: Test, testResult: TestResult, aggregatedResult: AggregatedResult) {
    this.results.push(testResult);

    if (testResult.numFailingTests > 0) {
      console.log(`FAIL ${testResult.testFilePath}`);
      testResult.testResults.forEach((result) => {
        if (result.status === 'failed') {
          console.log(`  ${result.fullName}`);
          result.failureMessages?.forEach((msg) => {
            console.log(`    ${msg.split('\n')[0]}`);
          });
        }
      });
    } else {
      console.log(`PASS ${testResult.testFilePath}`);
    }
  }

  onRunComplete(contexts: Set<Context>, results: AggregatedResult) {
    console.log('\nTest Summary:');
    console.log(`  Suites: ${results.numPassedTestSuites} passed, ${results.numFailedTestSuites} failed`);
    console.log(`  Tests: ${results.numPassedTests} passed, ${results.numFailedTests} failed`);
    console.log(`  Time: ${Math.round(results.startTime / 1000)}s`);
    console.log(`  Coverage: ${results.coverageMap ? 'collected' : 'not collected'}`);
  }

  getLastError(): Error | undefined {
    return undefined;
  }
}

export default CustomReporter;
```

## Custom Output Formats

### JSON Report Generator
```typescript
// reporters/json-summary.ts
import fs from 'fs';
import path from 'path';
import type { Reporter, AggregatedResult, TestResult } from '@jest/reporters';

class JsonSummaryReporter implements Reporter {
  private outputPath: string;
  private testResults: TestResult[] = [];

  constructor(globalConfig: any, options?: { outputPath?: string }) {
    this.outputPath = options?.outputPath || './test-results.json';
  }

  onRunStart() {
    this.testResults = [];
  }

  onTestResult(test: Test, testResult: TestResult) {
    this.testResults.push(testResult);
  }

  onRunComplete(contexts: Set<Context>, results: AggregatedResult) {
    const summary = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: results.startTime,
        totalSuites: results.numTotalTestSuites,
        totalTests: results.numTotalTests,
      },
      results: {
        passed: results.numPassedTests,
        failed: results.numFailedTests,
        skipped: results.numPendingTests,
        todo: results.numTodoTests,
      },
      suites: {
        passed: results.numPassedTestSuites,
        failed: results.numFailedTestSuites,
        total: results.numTotalTestSuites,
      },
      tests: this.testResults.map((suite) => ({
        file: suite.testFilePath,
        duration: suite.perfStats.runtime,
        results: suite.testResults.map((test) => ({
          name: test.fullName,
          status: test.status,
          duration: test.duration,
          failureMessage: test.failureMessages?.[0] || null,
        })),
      })),
    };

    fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
    fs.writeFileSync(this.outputPath, JSON.stringify(summary, null, 2));
  }

  getLastError() {
    return undefined;
  }
}

export default JsonSummaryReporter;
```

### HTML Reporter
```typescript
// reporters/html-reporter.ts
class HtmlReporter implements Reporter {
  private results: TestResult[] = [];
  private startTime: number = 0;

  onRunStart() {
    this.startTime = Date.now();
    this.results = [];
  }

  onTestResult(test: Test, testResult: TestResult) {
    this.results.push(testResult);
  }

  onRunComplete(contexts: Set<Context>, results: AggregatedResult) {
    const passed = results.numPassedTests;
    const failed = results.numFailedTests;
    const total = results.numTotalTests;
    const duration = Date.now() - this.startTime;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat { padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
    .passed { background: #d4edda; color: #155724; }
    .failed { background: #f8d7da; color: #721c24; }
    .total { background: #cce5ff; color: #004085; }
    .suite { border: 1px solid #ddd; margin: 10px 0; border-radius: 8px; overflow: hidden; }
    .suite-header { padding: 10px 15px; cursor: pointer; background: #f8f9fa; }
    .suite-name { font-weight: bold; }
    .suite-results { display: none; padding: 10px 15px; }
    .test { padding: 5px 0; border-bottom: 1px solid #eee; }
    .test.passed { background: none; color: #155724; }
    .test.failed { background: none; color: #721c24; }
    .error { background: #fff3f3; padding: 5px; margin-top: 5px; }
    .status { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .status-passed { background: #28a745; color: white; }
    .status-failed { background: #dc3545; color: white; }
  </style>
</head>
<body>
  <h1>Test Report</h1>
  <p>Generated: ${new Date().toLocaleString()} | Duration: ${duration}ms</p>

  <div class="summary">
    <div class="stat total">
      <h3>Total</h3>
      <h2>${total}</h2>
    </div>
    <div class="stat passed">
      <h3>Passed</h3>
      <h2>${passed}</h2>
    </div>
    <div class="stat failed">
      <h3>Failed</h3>
      <h2>${failed}</h2>
    </div>
    <div class="stat total">
      <h3>Pass Rate</h3>
      <h2>${passRate}%</h2>
    </div>
  </div>

  ${this.results.map((suite) => {
    const filePath = suite.testFilePath || '';
    const suiteName = filePath.split('/').pop() || 'unknown';
    const suitePassed = suite.numFailingTests === 0;

    return `
    <div class="suite">
      <div class="suite-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
        <span class="status ${suitePassed ? 'status-passed' : 'status-failed'}">
          ${suitePassed ? 'PASS' : 'FAIL'}
        </span>
        <span class="suite-name">${suiteName}</span>
      </div>
      <div class="suite-results">
        ${suite.testResults.map((test) => {
          const failed = test.status === 'failed';
          return `
          <div class="test ${test.status}">
            <span class="status ${failed ? 'status-failed' : 'status-passed'}">${test.status}</span>
            ${test.fullName}
            ${failed ? `
              <div class="error">
                ${test.failureMessages?.map((m) => `<pre>${escapeHtml(m)}</pre>`).join('')}
              </div>
            ` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('')}

  <script>
    document.querySelectorAll('.suite-results').forEach(el => el.style.display = 'block');
  </script>
</body>
</html>`;

    const outputPath = path.resolve(process.cwd(), 'test-report.html');
    fs.writeFileSync(outputPath, html);
    console.log(`HTML report generated: ${outputPath}`);
  }

  getLastError() {
    return undefined;
  }
}
```

## Notification Reporter

### Desktop Notifications
```typescript
// reporters/notification-reporter.ts
class NotificationReporter implements Reporter {
  onRunComplete(contexts: Set<Context>, results: AggregatedResult) {
    const passed = results.numPassedTests;
    const failed = results.numFailedTests;
    const total = results.numTotalTests;

    if (typeof window !== 'undefined') {
      new Notification('Jest Test Results', {
        body: `Passed: ${passed} | Failed: ${failed} | Total: ${total}`,
        icon: failed > 0 ? '/icons/fail.png' : '/icons/pass.png',
      });
    }

    if (failed > 0) {
      console.log(`\x07`); // Terminal bell
    }
  }
}
```

## Configuration

### Jest Config
```javascript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    ['./reporters/json-summary.ts', { outputPath: './reports/test-results.json' }],
    ['./reporters/html-reporter.ts'],
    ['./reporters/notification-reporter.ts'],
  ],
};
```

## Key Points
- Reporter interface defines lifecycle methods: onRunStart, onTestResult, onRunComplete
- Multiple reporters can be combined in jest.config.js
- AggregateResult provides overall test statistics
- TestResult provides per-file test details
- Custom output formats include JSON, HTML, XML, Markdown
- Notification reporters integrate with system notifications
- Reporters access globalConfig for runtime settings
- CI pipeline integration with JUnit XML format
- Custom reporters can integrate with dashboards and monitoring
- getLastError() returns errors from reporter operations
- Test file results include individual test case details
- Coverage information available in onRunComplete
- Performance metrics track test execution time
- Failure messages include stack traces for debugging
- Reporter output paths are configurable
- Multiple reporters serve different audiences (devs, CI, management)
- Reporters should handle edge cases (no tests, all skipped)
- Stream reporters for real-time test result output
- Third-party reporters extend functionality (Slack, Datadog)
- Custom reporters track historical test trends
- Sequential reporter execution processes results in order
- Reporter error handling prevents failures from crashing the suite
