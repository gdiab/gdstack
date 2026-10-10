---
name: 12-factor-eval
description: "Evaluate a repository against the twelve-factor methodology and write a scored assessment report. Use when asked to assess cloud-native readiness, check twelve-factor compliance, or review application deployment practices."
---

# Twelve-Factor Evaluation Skill

Analyze a repository against the [twelve-factor methodology](https://12factor.net/) and write a scored assessment report.

## Workflow

### Phase 1: Gather Context

Before analyzing code, ask the user for information not determinable from the repository:

**Required context (use AskUserQuestion):**
- Application name and business function
- Team size and release frequency
- Deployment environment (AWS, GCP, Azure, on-prem, etc.)
- External services not visible in code (payment processors, CRMs, etc.)

Skip questions if the user has already provided this information.

### Phase 2: Analyze Repository

Search systematically for evidence of each factor. Use Glob and Grep to find:

| Factor | What to Search For |
|--------|-------------------|
| 1. Codebase | `.git/`, monorepo configs (`nx.json`, `turbo.json`), CI configs |
| 2. Dependencies | `package.json`, `requirements.txt`, `go.mod`, lockfiles, `.nvmrc` |
| 3. Config | `process.env`, `.env*` files, hardcoded URLs/credentials, config directories |
| 4. Backing Services | Database connections, service URLs, retry/circuit breaker patterns |
| 5. Build/Release/Run | `.github/workflows/`, `Dockerfile`, `docker-compose.yml`, build scripts |
| 6. Processes | Session handling, filesystem usage, in-memory state (`new Map()`, caches) |
| 7. Port Binding | `app.listen`, `PORT` env var, `EXPOSE` in Dockerfile |
| 8. Concurrency | PM2 config, cluster module, Procfile, worker definitions |
| 9. Disposability | `SIGTERM`/`SIGINT` handlers, health checks, graceful shutdown |
| 10. Dev/Prod Parity | `docker-compose.yml`, environment-specific configs, mock services |
| 11. Logs | winston/pino/bunyan usage, stdout patterns, log aggregation config |
| 12. Admin Processes | `migrations/`, `scripts/`, management commands, one-off tasks |

### Phase 3: Score Each Factor

Apply consistent 0-3 scoring using [references/scoring-guide.md](references/scoring-guide.md):

- **Start at 3**, deduct based on issues found
- **Critical issues (-2 points):** Security vulnerabilities, scalability blockers, secrets in code, fundamental architectural problems
- **Minor issues (4+ = -1 point):** Inconsistent implementation, documentation gaps, partial automation

> [!WARNING]
> Never assume infrastructure details not visible in code. If evidence is unclear, ask the user.

### Phase 4: Ask Clarifying Questions

When evidence is ambiguous, ask rather than guess:
- "I see Redis is configured but no session handling code. Where are sessions stored?"
- "The CI config deploys to S3, but I don't see the production infrastructure. What services run this in production?"
- "There's a `scripts/` folder with database operations. Are these run against production directly?"

### Phase 5: Generate Report

Write a markdown report using the template in [references/output-template.md](references/output-template.md).

**Output file:** `./12-factor-evaluation-YYYY-MM-DD.md`

## Scoring Quick Reference

| Score | Meaning | Criteria |
|-------|---------|----------|
| 3 | Excellent | No critical issues, max 1 minor issue, clear best practices |
| 2 | Good | No critical issues, 2-3 minor issues, intentional implementation |
| 1 | Needs Work | 1 critical issue OR 4+ minor issues |
| 0 | Critical | Multiple critical issues OR no implementation OR anti-patterns |

## Output Formatting Rules

Document standards:
- Use YAML frontmatter with title, subtitle, author, date
- Start body at H2 (never H1)
- Use GitHub alerts: `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`
- Tables max 4-5 columns
- Code blocks with language identifiers
- Short paragraphs (2-4 sentences)
- Professional tone (avoid "comprehensive", "robust", "leverage")

## What NOT to Do

- Don't assume deployment infrastructure not visible in code
- Don't guess at team practices or processes
- Don't include actual credentials or sensitive URLs in evidence
- Don't skip factors even if evidence is limited (document what was searched)
- Don't provide scores without justification
