---
name: Multipart upload middleware
description: Project-specific constraint for handling multipart PDF uploads with Express raw-body parsing.
---

Express's raw-body middleware must be configured with the supported media type string `"multipart/form-data"` for these uploads. A regular-expression `type` value can leave the request body unparsed, even when the incoming Content-Type header is correct.

**Why:** The resume upload route initially received a correct multipart header but no Buffer because the middleware type matcher did not activate; the failure only appeared during a real curl upload.

**How to apply:** Keep multipart parsing route-scoped, enforce the upload size limit in the raw middleware and handler, and test with an actual multipart request after changes.