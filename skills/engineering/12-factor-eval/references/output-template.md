# Output Template

Use this structure for the generated evaluation report.

---

```yaml
---
title: "Twelve-Factor Application Assessment"
subtitle: "[APPLICATION_NAME]"
author: "Claude Code"
author_email: ""
author_title: "AI-Assisted Evaluation"
date: "YYYY-MM-DD"
---
```

## Executive Summary

[2-3 sentence overview of the application and evaluation findings]

### Score Summary

| Factor | Score | Status |
|--------|-------|--------|
| 1. Codebase | X/3 | [STATUS] |
| 2. Dependencies | X/3 | [STATUS] |
| 3. Config | X/3 | [STATUS] |
| 4. Backing Services | X/3 | [STATUS] |
| 5. Build, Release, Run | X/3 | [STATUS] |
| 6. Processes | X/3 | [STATUS] |
| 7. Port Binding | X/3 | [STATUS] |
| 8. Concurrency | X/3 | [STATUS] |
| 9. Disposability | X/3 | [STATUS] |
| 10. Dev/Prod Parity | X/3 | [STATUS] |
| 11. Logs | X/3 | [STATUS] |
| 12. Admin Processes | X/3 | [STATUS] |
| **Total** | **XX/36** | |

Status legend: Excellent (3), Good (2), Needs Work (1), Critical (0)

### Priority Recommendations

1. **[HIGH/MEDIUM/LOW]:** [First priority recommendation]
2. **[HIGH/MEDIUM/LOW]:** [Second priority recommendation]
3. **[HIGH/MEDIUM/LOW]:** [Third priority recommendation]

## Project Context

- **Application:** [Name and business function]
- **Team:** [Size] developers, [frequency] releases
- **Stack:** [Languages, frameworks, databases]
- **Deployment:** [Environment]

---

## Factor 1: Codebase

**Score: X/3** | [STATUS]

### Current Implementation
[Describe how codebase is organized and version controlled]

### Evidence
```
[Repository structure, branching strategy, deploy configs]
```

### Observations
[Document version control practices, deployment patterns, any concerns]

### Recommendations
[Required for scores 0-2]
- Priority: [High/Medium/Low]
- Effort: [Small/Medium/Large]

1. [Specific recommendation]
2. [Specific recommendation]

---

## Factor 2: Dependencies

**Score: X/3** | [STATUS]

### Current Implementation
[Describe dependency management approach]

### Evidence
```json
// Example package.json or equivalent
{
  "dependencies": { ... }
}
```

### Observations
[Document dependency management patterns and issues]

### Recommendations
[Required for scores 0-2]

---

## Factor 3: Config

**Score: X/3** | [STATUS]

### Current Implementation
[Describe configuration management]

### Evidence
```javascript
// Example config patterns (redact sensitive values)
```

### Observations
[Document config patterns and any security concerns]

### Recommendations
[Required for scores 0-2]

---

## Factor 4: Backing Services

**Score: X/3** | [STATUS]

### Current Implementation
[Describe external service integration]

### Evidence
```javascript
// Service connection patterns
```

### Observations
[Document service integration and resilience]

### Recommendations
[Required for scores 0-2]

---

## Factor 5: Build, Release, Run

**Score: X/3** | [STATUS]

### Current Implementation
[Describe build pipeline and deployment]

### Evidence
```yaml
# CI/CD configuration
```

### Observations
[Document build/deploy processes]

### Recommendations
[Required for scores 0-2]

---

## Factor 6: Processes

**Score: X/3** | [STATUS]

### Current Implementation
[Describe process execution and state handling]

### Evidence
```javascript
// State handling patterns
```

### Observations
[Document process patterns and state management]

### Recommendations
[Required for scores 0-2]

---

## Factor 7: Port Binding

**Score: X/3** | [STATUS]

### Current Implementation
[Describe service exposure]

### Evidence
```javascript
// Port binding implementation
```

### Observations
[Document service exposure patterns]

### Recommendations
[Required for scores 0-2]

---

## Factor 8: Concurrency

**Score: X/3** | [STATUS]

### Current Implementation
[Describe scaling approach]

### Evidence
```javascript
// Process management config
```

### Observations
[Document scaling patterns]

### Recommendations
[Required for scores 0-2]

---

## Factor 9: Disposability

**Score: X/3** | [STATUS]

### Current Implementation
[Describe startup/shutdown handling]

### Evidence
```javascript
// Signal handlers, health checks
```

### Observations
[Document lifecycle management]

### Recommendations
[Required for scores 0-2]

---

## Factor 10: Dev/Prod Parity

**Score: X/3** | [STATUS]

### Current Implementation
[Describe environment similarities]

### Evidence
```yaml
# docker-compose or environment configs
```

### Observations
[Document environment parity]

### Recommendations
[Required for scores 0-2]

---

## Factor 11: Logs

**Score: X/3** | [STATUS]

### Current Implementation
[Describe logging approach]

### Evidence
```javascript
// Logger configuration
```

### Observations
[Document logging patterns]

### Recommendations
[Required for scores 0-2]

---

## Factor 12: Admin Processes

**Score: X/3** | [STATUS]

### Current Implementation
[Describe admin task management]

### Evidence
```javascript
// Admin scripts, migrations
```

### Observations
[Document admin process patterns]

### Recommendations
[Required for scores 0-2]

---

## Appendix: Methodology

This evaluation follows the [twelve-factor methodology](https://12factor.net/), a set of best practices for building software-as-a-service applications. Each factor is scored 0-3:

- **3 (Excellent):** No critical issues, clear best practices
- **2 (Good):** No critical issues, minor improvements possible
- **1 (Needs Work):** Critical issue or multiple minor issues
- **0 (Critical):** Multiple critical issues or no implementation

Scoring starts at 3 and deducts for issues found. Critical issues (security vulnerabilities, scalability blockers) deduct 2 points. Four or more minor issues deduct 1 point.
