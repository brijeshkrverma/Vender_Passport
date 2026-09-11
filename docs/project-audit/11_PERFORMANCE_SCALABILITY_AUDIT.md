# Vendor Passport — Performance & Scalability Audit

## Overall Performance Score: 30 / 100

### Current Architecture

**Frontend:** All data loaded at app.js parse time (40+ arrays with ~1,500 items). All filters use O(n) `Array.filter()`. All views re-render full HTML strings on every `navigate()`. No lazy loading. No pagination. No virtual scrolling.

**Backend:** Claude API call is the only real bottleneck. Conversations stored in MongoDB with capped message history (last 10 turns). API responses include full context JSON — could be 50KB+ for general_summary intents.

### Bottlenecks at Scale (10,000 orgs, 100,000 users)

| Bottleneck | Current | At Scale | Fix |
|------------|---------|----------|-----|
| Frontend bundle | 348 KB (5,267 lines) | Acceptable for SPA | Code splitting not needed yet |
| Mock data loading | O(1) sync | Would be O(n) network calls | Proper API + caching |
| Search | O(n×m) substring scan | >100ms with 100K items | Move to backend with MongoDB text index |
| Filtering | O(n) array.filter() | Linear slowdown with data size | Server-side paginated queries |
| No pagination | Full render | DoS with large data sets | Add pagination/cursor-based fetching |
| unbounded arrays | linkedControls/mappedRisks | Write amplification at scale | Join table pattern |
| messages array | Embedded in conversation doc | 1000s of rewrite operations | Separate messages collection |
| Rate limiter | In-memory Map | Lost on restart/no shared state | Redis-backed rate limiting |
| Claude API | Single model call | Latency 1-5s + cost per token | Caching common queries; intent-based data slim |

### Missing Performance Patterns

| Pattern | Status |
|---------|--------|
| Database indexes | No indexes on any model except AssistantConversation (userId, createdAt) |
| Query optimization | No `.select()` for field projection; `.lean()` used correctly |
| Caching | No Redis, in-memory, or browser caching strategy |
| Background jobs | None — all synchronous |
| Connection pooling | Mongoose default (implicit) |
| File storage optimization | No file storage implemented |
| CDN | Not needed (local SPA) |
| Compression | Not enabled |
| Lazy loading (frontend) | None — all routes render on demand but data is always in memory |
| Bundle optimization | Not applicable (vanilla JS, no build step) |

### Recommendations

1. Add MongoDB indexes: `{orgId: 1, status: 1}`, `{orgId: 1, createdAt: -1}` on all models
2. Add `.select()` for field projection on all queries
3. Paginate all conversation/message endpoints with cursor-based pagination
4. Add server-side pagination on ALL list endpoints (when built)
5. Use Redis for rate limiting + session management
6. Move search to MongoDB `$text` index with relevance scoring
7. Add GZIP compression via Express middleware
8. Split messages into separate collection from conversations
