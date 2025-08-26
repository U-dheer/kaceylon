# Keycealon Backend - Authentication System

A complete Express.js backend with JWT-based authentication system for admin users.

## Features

- ✅ JWT Token-based Authentication (Access Token + Refresh Token)
- ✅ Admin User Registration & Login
- ✅ Password Reset (Forgot Password + Reset Password)
- ✅ Protected Routes Middleware
- ✅ Role-based Authorization
- ✅ Email Service for Password Reset
- ✅ Input Validation
- ✅ Rate Limiting
- ✅ Security Headers
- ✅ MongoDB Integration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd keycealon
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   - Copy `config.env` and update the values:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/keycealon
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production
   JWT_EXPIRE=15m
   JWT_REFRESH_EXPIRE=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**

   - Make sure MongoDB is running on your system
   - Or use MongoDB Atlas (cloud)

5. **Run the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication Routes

#### 1. Register Admin

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Admin Name",
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin" // optional, defaults to "admin"
}
```

#### 2. Login Admin

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

#### 3. Refresh Access Token

```http
POST /api/auth/refresh
```

- Notes:
- - The refresh endpoint reads the `refreshToken` from an HTTP-only cookie (set by the server). It performs rotation: the presented refresh token is validated and revoked, a new refresh token is issued and set as an HTTP-only cookie (path `/`), and a new access token is returned in the JSON response.
- - Clients must send cookies/credentials when calling this endpoint:
- - fetch example: `fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })`
- - axios example: `axios.post('/api/auth/refresh', null, { withCredentials: true })`
- - If a refresh token reuse or replay is detected (the token presented is already revoked), the server revokes all refresh tokens for that user and returns 401; the client should force a login in that case.

* If a refresh token reuse or replay is detected (the token presented is already revoked), the server revokes all refresh tokens for that user and returns 401; the client should force a login in that case.

#### 4. Logout

```http
POST /api/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### 5. Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

#### 6. Reset Password

```http
PUT /api/auth/reset-password/:resetToken
Content-Type: application/json

{
  "password": "newpassword123"
}
```

#### 7. Get Current Admin Profile

```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

#### 8. Update Profile

```http
PUT /api/auth/update-profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### 9. Change Password

```http
PUT /api/auth/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Health Check

```http
GET /api/health
```

## Response Format

All API responses follow this format:

```json
{
  "success": true/false,
  "message": "Response message",
  "data": {
    // Response data
  }
}
```

## Authentication Flow

1. **Login/Register**: Returns both access token and refresh token
2. **Access Token**: Short-lived (15 minutes), used for API requests
3. **Refresh Token**: Long-lived (7 days), used to get new access tokens
4. **Token Refresh**: When access token expires, use refresh token to get new access token
5. **Logout**: Invalidates refresh token

## Protected Routes

To access protected routes, include the access token in the Authorization header:

```http
Authorization: Bearer <access-token>
```

## Role-based Authorization

The system supports two roles:

- `admin`: Regular admin user
- `super-admin`: Super admin with additional privileges

Use the `authorize` middleware to restrict routes by role:

```javascript
const { protect, authorize } = require("../middleware/auth");

// Route accessible only to super-admin
router.get("/admin-only", protect, authorize("super-admin"), (req, res) => {
  // Route logic
});
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting (100 requests per 15 minutes per IP)
- Security headers with Helmet
- Input validation with express-validator
- CORS protection
- Environment variable configuration

## Database Schema

### Admin Model

```javascript
{
  name: String (required, 2-50 chars),
  email: String (required, unique, valid email),
  password: String (required, min 6 chars, hashed),
  role: String (enum: ['admin', 'super-admin'], default: 'admin'),
  isActive: Boolean (default: true),
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  refreshTokens: Array,
  createdAt: Date,
  updatedAt: Date
}
```

## Development

### Project Structure

```
keycealon/
├── models/
│   └── Admin.js
├── middleware/
│   └── auth.js
├── routes/
│   └── auth.js
├── utils/
│   └── emailService.js
├── config.env
├── package.json
├── server.js
└── README.md
```

### Adding New Routes

1. Create route file in `routes/` directory
2. Import and use in `server.js`
3. Apply middleware as needed

### Environment Variables

Update `config.env` with your specific values:

- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- `EMAIL_*`: Email service configuration

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong, unique JWT secrets
3. Configure proper CORS origins
4. Set up MongoDB Atlas or production MongoDB
5. Configure email service
6. Use HTTPS
7. Set up proper logging and monitoring

## License

ISC
