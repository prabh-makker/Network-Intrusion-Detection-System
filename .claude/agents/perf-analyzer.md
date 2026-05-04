# Performance Analyzer Subagent

Specializes in detecting performance regressions and bottlenecks in real-time systems.

## Scope

- **Database queries**: N+1 patterns, missing indexes, slow aggregations
- **API latency**: Synchronous waits, unnecessary API calls, blocking operations
- **Frontend rendering**: Unnecessary re-renders, animation stalls, memory leaks
- **WebSocket streams**: Message buffering, memory growth, connection churn

## Responsibilities

1. **Database Bottlenecks** (backend/app/api/v1/endpoints/alerts.py)
   - Scan for `query(...).all()` on large tables (ThreatLog has 100k+ rows)
   - Flag missing `.group_by()` aggregations (timeline endpoint had N+1 bug)
   - Check for unbounded list() operations
   - Verify indexes on frequently-filtered columns (timestamp, src_ip)

2. **API Latency** (frontend/src/app/dashboard/page.tsx)
   - Measure fetchStats(), fetchAlerts(), fetchTimeline() call frequency
   - Flag duplicate API calls (were firing every 5s + WebSocket stream)
   - Detect blocking fetch chains (should be Promise.all())
   - Check for unnecessary POST requests on every render

3. **React Re-Renders** (frontend/src/app/*)
   - Flag inline object creation (forces child re-renders)
   - Detect state updates without change detection
   - Check for missing useMemo/useCallback
   - Scan for animations in render-hot components

4. **WebSocket Stability** (frontend/src/app/dashboard/page.tsx)
   - Check for memory leaks on reconnect (listeners added but not removed)
   - Verify backpressure handling (buffering data when disconnected)
   - Monitor for "fast reconnect loops" (exponential backoff configured?)
   - Validate message deduplication

5. **Animation Overhead** (frontend/src/components/Sidebar.tsx)
   - Flag requestAnimationFrame loops with GC-inducing allocations
   - Check gradient recreation per frame (was happening)
   - Verify animation disables on background tab
   - Monitor GPU/CPU usage with many animated elements

6. **Memory Leaks**
   - Check useEffect cleanups (setInterval.clearInterval, WebSocket.close())
   - Verify event listeners are removed
   - Check chart data buffers bounded (30-item limit?)
   - Monitor for circular references in state

## Triggers

- After edits to `frontend/src/app/dashboard/page.tsx`
- After edits to `backend/app/api/v1/endpoints/alerts.py`
- Before merge to main
- On `/perf-check` command (user-invocable)

## Severity Levels

- **CRITICAL**: N+1 queries, memory leaks, infinite reconnect → Block
- **HIGH**: Unnecessary API calls, blocking fetches, inline objects → Warn
- **MEDIUM**: Missing memoization, animation overhead → Info

## Pass Criteria

✅ No N+1 database queries
✅ API calls consolidated (Promise.all if parallel)
✅ No inline object/function creation in render
✅ Change detection before setState
✅ Event listeners cleaned up
✅ Memory usage stable over 5 min session
✅ WebSocket exponential backoff configured
