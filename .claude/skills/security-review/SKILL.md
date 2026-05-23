---
name: security-review
description: Security audit for NIDS authentication, secrets, and network code
user-invocable: true
disable-model-invocation: true
context: fork
---

# Security Review Skill

Automated security auditing for FastAPI backend, JWT auth, password handling, and network packet processing.

## Usage

```
/security-review scope=<code|secrets|auth|network|all> severity=<low|medium|high|critical>
```

## Parameters

- **scope** (required): What to audit
  - `code` = General code security (SQL injection, XSS, etc.)
  - `secrets` = Hardcoded credentials, environment leaks
  - `auth` = JWT tokens, password hashing, session management
  - `network` = Scapy packet validation, network data handling
  - `all` = Comprehensive audit of everything

- **severity** (default: medium): Minimum issue severity to report
  - `low` = All issues including style suggestions
  - `medium` = Actual security concerns
  - `high` = Major vulnerabilities
  - `critical` = Exploitable issues only

## Audit Checklist

### 🔒 Secrets Management (scope=secrets)

- [ ] No hardcoded API keys, database passwords
- [ ] No secrets in git history
- [ ] `.env` files in `.gitignore`
- [ ] `.env.example` has no real values
- [ ] Environment variables properly loaded via `python-dotenv`
- [ ] Secrets never logged or printed
- [ ] Database credentials in environment, not code

**Files to check**:
- `backend/app/core/config.py`
- `backend/.env.example`
- `docker-compose.yml`
- All `*.py` files for hardcoded strings

### 🔐 Authentication & Authorization (scope=auth)

- [ ] JWT tokens use strong secrets (`SECRET_KEY` > 32 chars)
- [ ] Token expiration set (default: 24 hours max)
- [ ] Password hashing uses bcrypt (not plain text)
- [ ] Password salt cost ≥ 12
- [ ] CORS origin validation (not `*` in production)
- [ ] HTTPS enforced in production
- [ ] No user enumeration in login/registration
- [ ] Rate limiting on auth endpoints

**Files to check**:
- `backend/app/core/security.py`
- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/core/config.py`

**Key validations**:
```python
# Check JWT secret strength
assert len(SECRET_KEY) >= 32, "SECRET_KEY too short"

# Check password hashing
assert "bcrypt" in ALGORITHMS, "Must use bcrypt"

# Check token expiration
assert ACCESS_TOKEN_EXPIRE_MINUTES <= 1440, "Token lifetime too long"

# Check CORS
assert CORS_ORIGINS != "*", "CORS too permissive in prod"
```

### 💾 Database & SQL (scope=code)

- [ ] All SQL uses parameterized queries (SQLAlchemy ORM)
- [ ] No string concatenation for SQL
- [ ] Database transactions use proper rollback
- [ ] Connection pooling configured
- [ ] No SQL injection in alert filtering
- [ ] Database backups encrypted

**Files to check**:
- `backend/app/models/`
- `backend/app/services/`
- All SQLAlchemy query builders

**Validate**:
```python
# Good: Parameterized
db.query(Alert).filter(Alert.severity == severity).all()

# Bad: String concatenation (VULNERABLE)
db.query(Alert).filter(f"severity = '{severity}'").all()
```

### 🌐 Network & Scapy (scope=network)

- [ ] Packet headers validated before processing
- [ ] No buffer overflows in packet parsing
- [ ] Malformed packets handled gracefully
- [ ] Packet source IP validated (not spoofed)
- [ ] Network data sanitized before display
- [ ] No sensitive data in packet logs

**Files to check**:
- `sniffer/sniffer.py`
- `backend/app/ml/feature_engineer.py`
- Packet processing in traffic endpoints

**Validate**:
```python
# Check packet validation
assert packet.haslayer(IP), "Not an IP packet"
assert packet[IP].dst != "127.0.0.1", "Reject loopback"

# Validate feature extraction
assert len(features) == 26, "Feature dimension mismatch"
```

### 🛡️ API Security (scope=code)

- [ ] Input validation on all endpoints
- [ ] File upload validation (type, size)
- [ ] Rate limiting enabled
- [ ] Error messages don't leak internals
- [ ] Dependencies up-to-date (no known vulns)
- [ ] Security headers set (Content-Security-Policy, X-Frame-Options)

**Files to check**:
- `backend/app/api/v1/endpoints/`
- `backend/requirements.txt`

**Validate**:
```python
# Check input validation
@app.post("/api/v1/traffic/upload-pcap")
async def upload_pcap(file: UploadFile):
    assert file.size <= 100_000_000, "File too large"
    assert file.content_type == "application/octet-stream"
```

### 🔍 Logging & Monitoring (scope=code)

- [ ] No passwords logged
- [ ] No API keys in logs
- [ ] No user PII in logs
- [ ] Error logs don't leak system paths
- [ ] Audit logs for security events
- [ ] Monitoring for suspicious patterns

**Files to check**:
- `backend/app/core/logging.py`
- All `logger.*` calls in code

## Quick Audit Command

```bash
# Find hardcoded secrets (quick check)
grep -r "password\|secret\|api_key\|token" \
  --include="*.py" \
  backend/app/ \
  --exclude-dir=tests \
  | grep -v "^[[:space:]]*//" \
  | grep -v "os.getenv\|environ\|config\."

# Find SQL injection risks
grep -r "f\"\|\.format\(\|%\|concat" \
  --include="*.py" \
  backend/app/ \
  | grep -i "sql\|query\|filter" \
  | grep -v "\.all()\|\.filter()\|\.where()"

# Find unvalidated user input
grep -r "request.get\|request\[" \
  --include="*.py" \
  backend/app/ \
  | grep -v "UploadFile\|HTTPException"
```

## Report Format

```markdown
## Security Audit Report
Date: YYYY-MM-DD
Scope: [code|secrets|auth|network|all]
Severity Level: [low|medium|high|critical]

### Critical Issues
- [ ] Issue 1: Description + Risk + Fix

### High Priority
- [ ] Issue 2: Description + Risk + Fix

### Medium Priority
- [ ] Issue 3: Description + Risk + Fix

### Recommendations
- Suggestion 1
- Suggestion 2

### Pass/Fail
✅ PASS - No critical issues found
❌ FAIL - Critical issues found, do not deploy
```

## CI/CD Integration

Add to `.github/workflows/test-build-deploy.yml`:

```yaml
- name: Security Scan
  run: |
    /security-review scope=all severity=high
    # or use Trivy for image scanning
    trivy fs . --exit-code 1 --severity HIGH
```

## Automated Triggers

This skill runs automatically when:
- Code is pushed to `backend/app/core/security.py`
- `.env` files are modified
- Authentication endpoints change
- Network processing code changes
- Before production deployment

## Exception & Waivers

For issues that are acceptable risk:

```markdown
## Security Waiver
Issue: Hardcoded API endpoint in development config
Risk: Low (dev only, not in production)
Approved By: [Lead Security Engineer]
Expiration: 2026-12-31
Notes: Will be fixed before production release
```

## Related Skills

- `model-deploy` - Validates models before deployment
- Test coverage analyzer - Ensures security code has comprehensive tests

## Resources

- OWASP Top 10: https://owasp.org/Top10/
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- SQL Injection Prevention: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
