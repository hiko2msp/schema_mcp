## 2024-05-22 - [Stored XSS and Data Corruption in MetadataStore]
**Vulnerability:** Incomplete HTML sanitization in `MetadataStore` and a "double-sanitization" bug during updates.
**Learning:** Storing sanitized data on disk while providing a raw-like experience in search/updates requires careful handling of raw vs. encoded states. Specifically, updating sanitized data without unsanitizing first leads to double-encoding (e.g., `&` -> `&amp;` -> `&amp;amp;`).
**Prevention:** Follow a "load-unsanitize-update-save" pattern for fields that are sanitized on save. Ensure all user-provided fields (including nested ones like column descriptions) are covered by the sanitization logic.
