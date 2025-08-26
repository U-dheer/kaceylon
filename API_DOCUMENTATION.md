# kayceylon — API Documentation

## Brief plan

- Inspect route files and controllers to collect endpoints, methods, payloads, auth and responses.
- Produce a concise, copyable API reference with examples and error codes.

## Checklist

- [x] Document all public endpoints (health, forms, CTA, blogs)
- [x] Document authentication flow (access token, refresh token, cookies)
- [x] Document admin-only endpoints and required headers/cookies
- [x] Document file upload fields and limits
- [x] Provide example requests (PowerShell) and response shapes
- [x] Point to existing Postman collection where available

---

## Base

- Base URL (local): http://localhost:3000
- API prefix: /api
- Rate limiting: 100 requests per 15 minutes per IP (applies to paths under `/api/`) — 429 responses when exceeded
- CORS: origin controlled by FRONTEND_URL env variable

## Authentication

- Access token: JWT returned on `register` and `login` in JSON response under `data.accessToken`.
  - Send as header: `Authorization: Bearer <accessToken>`
  - The `protect` middleware also accepts `accessToken` in a cookie named `accessToken` as a fallback.
- Refresh token: issued on `register` and `login` and set as an HTTP-only cookie named `refreshToken` (path `/`, max-age 7 days). This cookie is used by the refresh endpoint and by logout to revoke tokens.
  - To refresh an access token call `POST /api/auth/refresh` — the server reads the refresh token cookie and returns a new access token.
- Role-based authorization: `authorize('admin')` is used for admin-only routes.

## Error format

On error the API uses a centralized error handler and typically returns JSON like:

{
"success": false,
"message": "Error message"
}

Common status codes:

- 200 OK
- 201 Created
- 204 No Content (successful delete)
- 400 Bad Request (validation)
- 401 Unauthorized (missing/invalid token)
- 403 Forbidden (insufficient role)
- 404 Not Found
- 429 Too Many Requests
- 500 Internal Server Error

---

## Health

GET /api/health

- Public. Returns server status and timestamp.
- Response 200:

{
"success": true,
"message": "Server is running",
"timestamp": "2025-08-26T..."
}

---

## Auth routes (prefix: /api/auth)

### POST /api/auth/register

- Purpose: Create an admin account (role defaults to `admin`).
- Body (application/json):
  - name (string)
  - email (string)
  - password (string)
  - role (optional, string)
- Response 201:
  {
  "success": true,
  "message": "Admin registered successfully",
  "data": {
  "admin": { /_ admin object (password removed) _/ },
  "accessToken": "<jwt>"
  }
  }
- Side effects: sets `refreshToken` cookie (httpOnly) for 7 days.

### POST /api/auth/login

- Purpose: Authenticate and receive an access token.
- Body (application/json): { email, password }
- Response 200:
  {
  "success": true,
  "message": "Login successful",
  "data": {
  "admin": { /_ admin object without password _/ },
  "accessToken": "<jwt>"
  }
  }
- Side effects: sets `refreshToken` cookie (httpOnly) for 7 days.

### POST /api/auth/refresh

- Purpose: Exchange a valid refresh token (cookie) for a new access token. The endpoint now performs refresh-token rotation: the presented refresh token is validated, revoked, and a new refresh token is issued and set as an HTTP-only cookie.
- Requirements: client must send the `refreshToken` cookie (the server sets it as HTTP-only and scoped by path `/api/auth/refresh` by default). Clients must include credentials when calling this endpoint (fetch: `credentials: 'include'`, axios: `withCredentials: true`).
- Middleware: `verifyRefreshToken` (validates the cookie and attaches `req.tokenDoc` and `req.admin`).
- Behaviour on success: returns 200 with a new access token in JSON and sets a rotated refresh token cookie.
- Behaviour on reuse detection: if a presented refresh token is already revoked (possible token reuse), the server revokes all refresh tokens for that user and responds with 401 — the client must re-authenticate.
- Response 200:
  {
  "success": true,
  "message": "Token refreshed successfully",
  "data": { "accessToken": "<jwt>" }
  }

### POST /api/auth/logout

- Purpose: Revoke refresh token and clear cookie.
- Auth: Protected — requires access token (Authorization header or cookie `accessToken`).
- Response 200:
  {
  "success": true,
  "message": "Logged out successfully"
  }

---

## Forms & Call-to-Action

### POST /api/auth/makeAForm

- Purpose: Submit contact / form data (public).
- Body (application/json):
  - cNameOrName (string) — company or name
  - email (string)
  - message (string)
  - phone (string)
  - address (string)
- Response 201:
  {
  "status": "success",
  "data": { /_ form document _/ }
  }
- Side effects: sends an email to site admin and a confirmation email to the submitter.

### POST /api/auth/callToAction

- Purpose: Subscribe user to updates.
- Body (application/json): { email }
- Response 201:
  {
  "status": "success",
  "data": { /_ subscription document _/ }
  }
- Duplicate subscription returns 400 with message 'Email is already subscribed'.

### GET /api/auth/getAllForms

- Purpose: Admin-only list of all forms.
- Auth: Protected & authorize('admin')
- Response 200: { status: "success", results: <n>, data: [ ...forms ] }

### GET /api/auth/getOneForm/:id

- Purpose: Admin-only; mark form as read and return it.
- Params: id (form \_id)
- Auth: Protected & authorize('admin')
- Response 200: { status: "success", data: { /_ form _/ } }

### DELETE /api/auth/deleteForm/:id

- Purpose: Admin-only; delete form.
- Auth: Protected & authorize('admin')
- Response 204 No Content

---

## Blogs

Notes: Blog create/update accepts multipart/form-data with files field `photos` (up to 6 files).

### POST /api/auth/makeABlog

- Purpose: Create a blog post (admin only).
- Auth: Protected & authorize('admin')
- Content-Type: multipart/form-data
- Fields:
  - title (string)
  - content (string)
  - link (string)
  - photos - file array, field name `photos`, max 6 files
- Response 201:
  {
  "status": "success",
  "data": { /_ blog document including photo array [{url,public_id}] _/ }
  }
- Side effects: stores photos in Cloudinary, sends notification emails to admin and subscribers (in batches).

### GET /api/auth/getAllBlogs

- Purpose: Public list of blogs.
- Response 200: { status: "success", results: <n>, data: [ ...blogs ] }

### PATCH /api/auth/updateBlog/:id

- Purpose: Update blog metadata and optionally replace photos.
- Auth: Protected & authorize('admin')
- Content-Type: multipart/form-data (if updating photos) or application/json
- Fields: title, content, link, photos (file array)
- Behavior: If new photos provided, existing photos are removed from Cloudinary and replaced.
- Response 200: { status: "success", data: { /_ updated blog _/ } }

### DELETE /api/auth/deleteBlog/:id

- Purpose: Admin-only delete blog and its images.
- Auth: Protected & authorize('admin')
- Response 204 No Content

### GET /api/auth/getOneBlog/:id

- Purpose: Public fetch one blog by id (read a single blog post).
- Auth: Public — no access token required.
- Response 200: { status: "success", data: { /_ blog _/ } }

---

## Upload details

- Field name: `photos`
- Max files per request: 6
- Upload handling: `multer` + custom `multiFileUpload` which uploads to Cloudinary; photos returned in document as array of objects { url, public_id }.

---

## Examples (PowerShell)

1. Login and store access token in a variable

```powershell
$body = @{ email = 'admin@example.com'; password = 'secret' } | ConvertTo-Json
$res = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
$access = $res.data.accessToken
$res | ConvertTo-Json -Depth 5
```

2. Call an admin endpoint with Authorization header

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/getAllForms' -Method Get -Headers @{ Authorization = "Bearer $access" } | ConvertTo-Json -Depth 5
```

3. Refresh token (browser or client must send cookie `refreshToken`; ensure requests include credentials so the cookie is sent)

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/refresh' -Method Post -WebSession $session
```

4. Create a blog with files (using curl as an example if available)

Note: PowerShell examples for multipart uploads are more verbose; use a tool like Postman or curl for file uploads:

```powershell
# curl example (if curl is available)
curl -X POST "http://localhost:3000/api/auth/makeABlog" -H "Authorization: Bearer $access" -F "title=My Post" -F "content=Body of the post" -F "link=https://example.com/my-post" -F "photos=@C:\path\to\img1.jpg" -F "photos=@C:\path\to\img2.jpg"
```

---

## Postman

- A Postman collection is included at `scripts/postman_collection.json` — import it to test endpoints quickly.

---

## Notes and gotchas

-- Refresh token cookie is scoped to path `/` (site-wide). When calling the refresh endpoint from a browser, ensure the request includes credentials (fetch: `credentials: 'include'`, axios: `withCredentials: true`) so the cookie is sent.

- Rate limiter is applied to `/api/` (100 requests / 15 minutes). Consider this when running automated tests.
- Admin-only routes require the admin account to be active (`isActive` check applies).

---

## Files changed / created

- `API_DOCUMENTATION.md` — API reference added to repository root.

## Completion summary

- Created `API_DOCUMENTATION.md` containing endpoints, auth, payloads, responses, PowerShell examples, and notes; matched routes implemented in `routes/authRouter.js` and controllers.

## Requirements coverage

- make a api documentation — Done (created `API_DOCUMENTATION.md` documenting all routes and auth behavior).
