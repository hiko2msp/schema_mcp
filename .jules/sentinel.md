
## 2026-02-05 - Recursive Sanitization and Idempotency in Metadata Store
**Vulnerability:** Stored XSS in column descriptions and double-encoding of HTML entities.
**Learning:** Only top-level table descriptions were sanitized, leaving nested column descriptions vulnerable. Additionally, simple replacement-based sanitization without unescaping first leads to double-encoded entities (e.g., & -> &amp; -> &amp;amp;) when data is saved multiple times.
**Prevention:** Implement recursive sanitization for all nested data structures. Use an idempotent pattern: `escape(unescape(text))` to ensure data is sanitized exactly once regardless of its initial state. Always search against unescaped data to maintain consistent user experience.
