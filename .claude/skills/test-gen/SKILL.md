---
name: test-gen
description: Generate test cases for Python functions and TypeScript components
disable-model-invocation: true
---

# Test Generator

Auto-generates pytest test files for Python functions and Jest test files for React components.

## Instructions

### Python Tests

1. User provides: function name or file path (e.g., "generate tests for geoip_lookup")
2. Locate the function in `backend/app/api/v1/endpoints/alerts.py`
3. Generate `backend/tests/test_<module>.py` with:
   - Happy path tests (valid inputs)
   - Edge cases (empty results, timeouts, errors)
   - Mocking external calls (ip-api.com, database)
   - Assertions for return types and values
   - Rate limit cache validation

### TypeScript/React Tests

1. User provides: component path (e.g., "tests for BootStepItem")
2. Generate Jest test in `frontend/src/__tests__/<component>.test.tsx`
3. Include:
   - Component render tests
   - State change simulations
   - Props variations
   - Motion animations snapshots
   - Dark/light mode theme verification

## Templates

### Python pytest template
```python
import pytest
from unittest.mock import patch, MagicMock
from app.api.v1.endpoints.alerts import geoip_lookup

@pytest.mark.asyncio
async def test_geoip_lookup_cache_hit(db_session):
    # Test that cached results return without API call
    pass

@pytest.mark.asyncio
async def test_geoip_lookup_timeout():
    # Test timeout handling
    pass
```

### React Jest template
```typescript
import { render, screen } from '@testing-library/react';
import { BootStepItem } from '@/app/startup/page';

describe('BootStepItem', () => {
  it('renders complete step with checkmark', () => {
    // Test rendering
  });
});
```
