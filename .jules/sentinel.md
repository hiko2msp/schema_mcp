## 2026-02-01 - [Double-Sanitization and Nested XSS]
**Vulnerability:** Stored XSS in `column.description` (missed during initial `table.description` fix) and data corruption via double-sanitization in `updateTableMetadata`.
**Learning:** Fixing XSS by sanitizing on storage can lead to double-encoding (e.g., `&` -> `&amp;` -> `&amp;amp;`) if updates are applied to already-sanitized data without reverting it first.
**Prevention:** Implement a symmetric `unsanitize` method when using "sanitize-on-storage" patterns. Load, unsanitize, apply update, then save (which re-sanitizes). Ensure sanitization is applied recursively to all nested fields like `column.description`.
