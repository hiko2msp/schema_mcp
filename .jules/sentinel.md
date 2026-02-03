## 2025-02-03 - Double-sanitization and Incomplete Nested Sanitization
**Vulnerability:** Stored XSS and Data Corruption.
**Learning:** Sanitization was only applied to top-level fields (table description) and not nested ones (column descriptions). Furthermore, partial updates loaded already-sanitized data and re-sanitized it upon saving, leading to double-sanitization (e.g., `&` -> `&amp;` -> `&amp;amp;`).
**Prevention:** Apply sanitization recursively to all user-controlled nested fields. When performing partial updates on sanitized storage, always unsanitize the data first to a raw state, apply updates, and then perform a single sanitization pass before persistence.
