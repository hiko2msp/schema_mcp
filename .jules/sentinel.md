## 2025-05-15 - Idempotent Sanitization Pattern in MetadataStore
**Vulnerability:** Double HTML sanitization leading to data corruption and Stored XSS due to incomplete sanitization of nested structures.
**Learning:** In a self-growing metadata store where data is repeatedly loaded, updated, and saved, simple sanitization on save can lead to multiple encodings (e.g., `<` becomes `&lt;` then `&amp;lt;`). Additionally, sanitizing only top-level fields (table descriptions) leaves nested fields (column descriptions) vulnerable.
**Prevention:** 1) Use an idempotent pattern `escape(unescape(text))` in the central save method to ensure exactly-once sanitization regardless of input state. 2) Apply sanitization recursively to all user-controllable text fields in nested data structures.
