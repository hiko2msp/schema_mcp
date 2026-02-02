## 2025-05-14 - [Double-Sanitization and Recursive Sanitization in Metadata Store]
**Vulnerability:** Stored XSS via incomplete sanitization of nested metadata (columns) and data corruption via double-sanitization during updates.
**Learning:** The `MetadataStore` stores sanitized HTML in YAML files. When updating existing metadata, loading it returns sanitized data. Applying new raw updates and re-saving caused double-encoding of special characters (e.g., `&` -> `&amp;` -> `&amp;amp;`).
**Prevention:** Follow the "unsanitize-update-sanitize" pattern: 1. Load sanitized data. 2. Recursively unsanitize all fields. 3. Apply raw updates. 4. Recursively sanitize all fields (including nested ones like columns) and save. Perform searches against unsanitized content to ensure consistent results.
