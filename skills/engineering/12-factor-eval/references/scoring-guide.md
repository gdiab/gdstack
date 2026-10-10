# Twelve-Factor Scoring Guide

## Scoring Methodology

Start at score 3 and deduct based on issues found.

### Critical Issues (-2 points)
- Security vulnerabilities (hardcoded credentials, exposed secrets)
- Major scalability blockers
- Fundamental architectural problems
- Issues requiring significant refactoring

### Minor Issues (accumulate; 4+ = -1 point)
- Inconsistent implementation
- Documentation gaps
- Partial automation
- Technical debt that can be incrementally addressed

## Evidence Threshold Rules

| Score | Requirements |
|-------|-------------|
| 3 | No critical issues, max 1 minor issue, clear evidence of best practices |
| 2 | No critical issues, 2-3 minor issues acceptable, intentional implementation |
| 1 | 1 critical issue OR 4+ minor issues, basic implementation attempt |
| 0 | Multiple critical issues OR no implementation OR anti-patterns |

## Factor-Specific Criteria

### Factor 1: Codebase

| Score | Examples |
|-------|----------|
| 3 | Single Git repo, clear branching strategy, automated deploys, no shared code between apps |
| 2 | Version controlled but manual deployment steps, minor code sharing, inconsistent version tagging |
| 1 | Multiple repos for one app, heavy manual deployment, significant code duplication |
| 0 | No version control, code copied between environments, divergent codebases |

### Factor 2: Dependencies

| Score | Examples |
|-------|----------|
| 3 | Complete manifests, locked versions, no system-level deps, clean dev setup |
| 2 | Most deps declared, mixed version locking, few system deps |
| 1 | Basic declaration, no version locking, many system deps |
| 0 | No dependency management, direct library inclusion, undocumented setup |

### Factor 3: Config

| Score | Examples |
|-------|----------|
| 3 | All config in env vars, secure secrets management, no credentials in code |
| 2 | Most config in env vars, basic secrets management, some non-sensitive config in code |
| 1 | Mixed config management, passwords in config files, environment-specific code |
| 0 | Hardcoded credentials, no config management, all configuration in code |

### Factor 4: Backing Services

| Score | Examples |
|-------|----------|
| 3 | Services defined by URLs in config, easy switching, clear abstraction, resilient connections |
| 2 | Most services configurable, some hardcoded, basic abstraction, some error handling |
| 1 | Limited configuration, environment-specific code, tight coupling, poor error handling |
| 0 | Hardcoded connections, no abstraction, direct dependencies, no error handling |

### Factor 5: Build, Release, Run

| Score | Examples |
|-------|----------|
| 3 | Automated CI/CD, clear stage separation, immutable releases, automated rollback |
| 2 | Basic CI/CD with manual steps, some separation, release versioning with issues |
| 1 | Manual build process, minimal separation, no clear release process |
| 0 | No build process, direct production deployment, no release management |

### Factor 6: Processes

| Score | Examples |
|-------|----------|
| 3 | Completely stateless, external session storage, no shared memory/files |
| 2 | Mostly stateless with caching, session handling with minor issues |
| 1 | Significant local state, local session storage, shared resources |
| 0 | Fully stateful, process-bound sessions, heavy shared state |

### Factor 7: Port Binding

| Score | Examples |
|-------|----------|
| 3 | Self-contained server, dynamic port config, clean interfaces, no external webserver |
| 2 | Mostly self-contained, basic port config, limited external deps |
| 1 | Significant external deps, hardcoded ports, inconsistent interfaces |
| 0 | Complete reliance on external servers, no port config, cannot run standalone |

### Factor 8: Concurrency

| Score | Examples |
|-------|----------|
| 3 | Horizontal scaling ready, process type separation, stateless processing |
| 2 | Basic scaling capability, some process separation, mostly stateless |
| 1 | Limited scaling, mixed process types, significant state issues |
| 0 | No scaling possible, no process separation, fully stateful |

### Factor 9: Disposability

| Score | Examples |
|-------|----------|
| 3 | Fast startup (<10s), graceful shutdown, clean termination, robust recovery |
| 2 | Moderate startup (10-30s), basic shutdown handling, some recovery |
| 1 | Slow startup (30+s), poor shutdown handling, minimal recovery |
| 0 | Very slow startup, no shutdown handling, no recovery |

### Factor 10: Dev/Prod Parity

| Score | Examples |
|-------|----------|
| 3 | Identical tech stack, container-based dev, same backing services, automated setup |
| 2 | Similar environments with minor differences, some container usage |
| 1 | Significant environment differences, no containerization, manual setup |
| 0 | Completely different environments, no dev environment, no setup process |

### Factor 11: Logs

| Score | Examples |
|-------|----------|
| 3 | Centralized aggregation, structured formats, no file management, event streaming |
| 2 | Basic aggregation, semi-structured logs, some file logging |
| 1 | Local files only, unstructured, manual management |
| 0 | No logging strategy, direct console output, no management |

### Factor 12: Admin Processes

| Score | Examples |
|-------|----------|
| 3 | Tasks run against releases, same codebase, proper access controls, process isolation |
| 2 | Most tasks against releases, mostly shared codebase, basic access control |
| 1 | Direct database manipulation, separate scripts, poor access control |
| 0 | No admin processes, ad-hoc management, direct production changes |

## Common Scenarios

### Legacy Applications
Consider modernization trajectory. Active improvement efforts may warrant a higher score despite current limitations.

### Microservices
Evaluate as a system. A critical issue in one service (especially auth) affects the whole system.

### Regulated Environments
Compliance requirements may justify patterns that would otherwise score lower (e.g., local file logging for audit trails).

## When in Doubt

- Critical issues push toward lower score
- Document reasoning in observations
- Consider business impact
- For legacy apps, consider direction of improvement
