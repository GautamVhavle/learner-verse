# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest `main` | Yes |

## Reporting a Vulnerability

If you discover a security vulnerability in LearnerVerse, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email **gautamvhavle@gmail.com** with:

1. A description of the vulnerability
2. Steps to reproduce or a proof of concept
3. The potential impact
4. Any suggested fixes (optional)

### What to Expect

- **Acknowledgment** within 48 hours of your report
- **Status update** within 7 days with an assessment and expected timeline
- **Credit** in the fix commit and release notes (unless you prefer to remain anonymous)

## Security Practices

LearnerVerse follows these security practices:

- **Authentication:** JWT-based auth via Auth0 with RS256 signature verification
- **Authorization:** Server-side checks on all protected endpoints
- **Input validation:** Pydantic schemas for all API inputs
- **SQL injection protection:** SQLAlchemy ORM with parameterized queries
- **XSS prevention:** React's built-in escaping, HTML entity encoding in OG tags
- **CORS:** Configurable allowed origins, not wildcard in production
- **Secrets:** Environment variables only, never committed to source control
- **Dependencies:** Regular updates monitored via Dependabot
- **CI/CD:** Automated linting and testing on all pushes

## Scope

The following are in scope for security reports:

- The LearnerVerse web application (frontend and backend)
- Authentication and authorization bypass
- Data exposure or leakage
- Injection vulnerabilities (SQL, XSS, CSRF)
- Insecure direct object references

The following are out of scope:

- Denial of service attacks
- Social engineering
- Issues in third-party dependencies (report those upstream)
- The hosted instance at learnerverse.xyz (report infrastructure issues directly)
