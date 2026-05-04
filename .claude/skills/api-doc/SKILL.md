---
name: api-doc
description: Generate OpenAPI 3.0 spec from FastAPI endpoints and security info
disable-model-invocation: true
---

# API Documentation Generator

Extracts all FastAPI routes and generates OpenAPI 3.0 specification.

## Instructions

1. Scan `backend/app/api/v1/endpoints/*.py` for all router endpoints
2. Extract for each endpoint:
   - Path, HTTP method, summary/docstring
   - Request/response schemas (Pydantic models)
   - Security requirements (OAuth2, API keys)
   - Query/path parameters with types
3. Read `backend/app/core/config.py` to identify security schemes:
   - OAuth2 HS256 with bearer token
   - Access token expiry (90 days)
4. Extract rate limits from `@limiter.limit()` decorators in `login.py`
5. Generate `openapi.json` with:
   - API title: "NIDS Sentinel API"
   - Version: "1.0.0"
   - Security schemes section
   - Complete request/response examples for all endpoints

## Output

Creates `backend/openapi.json` with full OpenAPI 3.0 spec ready for:
- Swagger UI integration
- Client SDK generation
- API documentation sites
