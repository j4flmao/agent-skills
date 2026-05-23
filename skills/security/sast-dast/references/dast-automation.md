# DAST Automation

## DAST in CI/CD Pipeline
`yaml
# GitHub Actions DAST job
dast-scan:
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to staging
      run: ./deploy-staging.sh
    - name: Run ZAP DAST scan
      uses: zaproxy/action-full-scan@v0.7.0
      with:
        target: 'https://staging.example.com'
        rules_file_name: 'zap-rules.tsv'
        cmd_options: '-a -j'
    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: zap-report
        path: report.html
`

## Scan Types
| Scan Type | Description | Duration |
|-----------|-------------|----------|
| Spider | Crawl all pages to discover endpoints | Minutes |
| Active scan | Send malicious payloads to find vulnerabilities | Hours |
| AJAX spider | Crawl JavaScript-heavy SPA applications | Minutes |
| Passive scan | Analyze traffic without sending payloads | Real-time |

## DAST Best Practices
- Run after every staging deployment
- Scan authenticated areas (provide session cookies)
- Use context-specific authentication
- Alert on high/critical findings only (reduce noise)
- Schedule full scans weekly
- Run quick scans on every PR
