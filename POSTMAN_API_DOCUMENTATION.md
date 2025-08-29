# Kayceylon API - Complete Postman Documentation

## 📋 Overview
This documentation provides comprehensive Postman collection details for the Kayceylon API including all endpoints, request/response examples, authentication flows, and testing scenarios.

**Base URL:** `http://localhost:3000`  
**API Prefix:** `/api`  
**Rate Limit:** 100 requests per 15 minutes per IP  

---

## 🔐 Authentication System

### Token Types
- **Access Token**: JWT for API authorization (expires in 15 minutes)
- **Refresh Token**: Long-lived token stored as HTTP-only cookie (7 days)

### Headers Required
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## 📁 Postman Collection Structure

### 1️⃣ Health Check
### 2️⃣ Authentication
### 3️⃣ Forms Management
### 4️⃣ Email Subscriptions
### 5️⃣ Blog Management

---

## 📊 Collection Details

### 🏥 **1. Health Check**

#### `GET /api/health`
**Purpose:** Check server status  
**Auth:** None required  

**Request:**
```http
GET {{baseUrl}}/api/health
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-08-28T10:30:45.123Z"
}
```

---

### 🔑 **2. Authentication Endpoints**

#### `POST /api/auth/register`
**Purpose:** Create admin account  
**Auth:** None required  

**Request Body:**
```json
{
  "name": "John Admin",
  "email": "admin@kayceylon.com",
  "password": "SecurePass123!",
  "role": "admin"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "admin": {
      "_id": "66cf2a1b8e4d5f123456789a",
      "name": "John Admin",
      "email": "admin@kayceylon.com",
      "role": "admin",
      "isActive": true,
      "createdAt": "2025-08-28T10:30:45.123Z",
      "lastLogin": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Admin with this email already exists"
}
```

---

#### `POST /api/auth/login`
**Purpose:** Authenticate admin  
**Auth:** None required  

**Request Body:**
```json
{
  "email": "admin@kayceylon.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "_id": "66cf2a1b8e4d5f123456789a",
      "name": "John Admin",
      "email": "admin@kayceylon.com",
      "role": "admin",
      "isActive": true,
      "lastLogin": "2025-08-28T10:35:22.456Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
```json
// 401 Unauthorized - Invalid credentials
{
  "success": false,
  "message": "Invalid credentials"
}

// 401 Unauthorized - Account deactivated
{
  "success": false,
  "message": "Account is deactivated"
}
```

---

#### `POST /api/auth/refresh`
**Purpose:** Get new access token using refresh token  
**Auth:** Refresh token cookie required  

**Request Headers:**
```
Cookie: refreshToken=<refresh_token_value>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Refresh token reuse detected. All sessions revoked. Please log in again."
}
```

---

#### `POST /api/auth/logout`
**Purpose:** Logout and revoke refresh token  
**Auth:** Access token required  

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 📝 **3. Forms Management**

#### `POST /api/auth/makeAForm`
**Purpose:** Submit contact form (public endpoint)  
**Auth:** None required  

**Request Body:**
```json
{
  "cNameOrName": "John Doe Company",
  "email": "contact@example.com",
  "message": "I'm interested in your services. Please contact me for a consultation.",
  "phone": "+1-555-123-4567",
  "address": "123 Business St, City, State 12345"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "_id": "66cf2b1c8e4d5f123456789b",
    "cNameOrName": "John Doe Company",
    "email": "contact@example.com",
    "message": "I'm interested in your services. Please contact me for a consultation.",
    "phone": "+1-555-123-4567",
    "address": "123 Business St, City, State 12345",
    "read": false,
    "createdAt": "2025-08-28T10:40:15.789Z",
    "__v": 0
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "All fields are required"
}
```

---

#### `GET /api/auth/getAllForms`
**Purpose:** Get all submitted forms (Admin only)  
**Auth:** Admin access token required  

**Request Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "results": 2,
  "data": [
    {
      "_id": "66cf2b1c8e4d5f123456789b",
      "cNameOrName": "John Doe Company",
      "email": "contact@example.com",
      "message": "I'm interested in your services...",
      "phone": "+1-555-123-4567",
      "address": "123 Business St, City, State 12345",
      "read": false,
      "createdAt": "2025-08-28T10:40:15.789Z"
    },
    {
      "_id": "66cf2b1c8e4d5f123456789c",
      "cNameOrName": "Jane Smith Corp",
      "email": "jane@smithcorp.com",
      "message": "Looking for partnership opportunities...",
      "phone": "+1-555-987-6543",
      "address": "456 Corporate Ave, Metro City 67890",
      "read": true,
      "createdAt": "2025-08-28T09:20:30.123Z"
    }
  ]
}
```

---

#### `GET /api/auth/getOneForm/:id`
**Purpose:** Get specific form and mark as read (Admin only)  
**Auth:** Admin access token required  

**Request Headers:**
```
Authorization: Bearer <admin_access_token>
```

**URL Parameters:**
- `id`: Form ID (MongoDB ObjectId)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "_id": "66cf2b1c8e4d5f123456789b",
    "cNameOrName": "John Doe Company",
    "email": "contact@example.com",
    "message": "I'm interested in your services. Please contact me for a consultation.",
    "phone": "+1-555-123-4567",
    "address": "123 Business St, City, State 12345",
    "read": true,
    "createdAt": "2025-08-28T10:40:15.789Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "No form found with that ID"
}
```

---

#### `DELETE /api/auth/deleteForm/:id`
**Purpose:** Delete specific form (Admin only)  
**Auth:** Admin access token required  

**Request Headers:**
```
Authorization: Bearer <admin_access_token>
```

**URL Parameters:**
- `id`: Form ID (MongoDB ObjectId)

**Response (204 No Content):**
```
No response body
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "No form found with that ID"
}
```

---

### 📧 **4. Email Subscriptions**

#### `POST /api/auth/callToAction`
**Purpose:** Subscribe to email updates (public endpoint)  
**Auth:** None required  

**Request Body:**
```json
{
  "email": "subscriber@example.com"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "_id": "66cf2c1d8e4d5f123456789d",
    "email": "subscriber@example.com",
    "createdAt": "2025-08-28T10:45:30.456Z",
    "__v": 0
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Email is already subscribed"
}
```

---

### 📰 **5. Blog Management**

#### `POST /api/auth/makeABlog`
**Purpose:** Create new blog post with images (Admin only)  
**Auth:** Admin access token required  
**Content-Type:** `multipart/form-data`

**Request Headers:**
```
Authorization: Bearer <admin_access_token>
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "Latest Technology Trends in 2025"
content: "In this comprehensive guide, we explore the cutting-edge technologies that are shaping the future..."
link: "https://kayceylon.com/blog/tech-trends-2025"
photos: [file1.jpg] (max 6 files)
photos: [file2.jpg]
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "_id": "66cf2d1e8e4d5f123456789e",
    "title": "Latest Technology Trends in 2025",
    "content": "In this comprehensive guide, we explore the cutting-edge technologies...",
    "link": "https://kayceylon.com/blog/tech-trends-2025",
    "photo": [
      {
        "url": "https://res.cloudinary.com/demo/image/upload/v1693234567/kayceylon/blogs/sample1.jpg",
        "public_id": "kayceylon/blogs/sample1",
        "_id": "66cf2d1e8e4d5f123456789f"
      },
      {
        "url": "https://res.cloudinary.com/demo/image/upload/v1693234568/kayceylon/blogs/sample2.jpg",
        "public_id": "kayceylon/blogs/sample2",
        "_id": "66cf2d1e8e4d5f12345678a0"
      }
    ],
    "createdAt": "2025-08-28T10:50:45.789Z",
    "__v": 0
  }
}
```

**Error Responses:**
```json
// 400 Bad Request - Missing fields
{
  "success": false,
  "message": "All fields are required"
}

// 400 Bad Request - No photos
{
  "success": false,
  "message": "At least one photo is required"
}

// 500 Internal Server Error - Upload failed
{
  "success": false,
  "message": "File upload failed"
}
```

---

#### `GET /api/auth/getAllBlogs`
**Purpose:** Get all blog posts (public endpoint)  
**Auth:** None required  

**Response (200 OK):**
```json
{
  "status": "success",
  "results": 3,
  "data": [
    {
      "_id": "66cf2d1e8e4d5f123456789e",
      "title": "Latest Technology Trends in 2025",
      "content": "In this comprehensive guide, we explore...",
      "link": "https://kayceylon.com/blog/tech-trends-2025",
      "photo": [
        {
          "url": "https://res.cloudinary.com/demo/image/upload/v1693234567/kayceylon/blogs/sample1.jpg",
          "public_id": "kayceylon/blogs/sample1"
        }
      ],
      "createdAt": "2025-08-28T10:50:45.789Z"
    },
    {
      "_id": "66cf2d1e8e4d5f123456789f",
      "title": "Digital Marketing Strategies for 2025",
      "content": "Discover the most effective digital marketing approaches...",
      "link": "https://kayceylon.com/blog/digital-marketing-2025",
      "photo": [
        {
          "url": "https://res.cloudinary.com/demo/image/upload/v1693234569/kayceylon/blogs/marketing.jpg",
          "public_id": "kayceylon/blogs/marketing"
        }
      ],
      "createdAt": "2025-08-28T09:30:15.456Z"
    }
  ]
}
```

---

#### `GET /api/auth/getOneBlog/:id`
**Purpose:** Get specific blog post (public endpoint)  
**Auth:** None required  

**URL Parameters:**
- `id`: Blog ID (MongoDB ObjectId)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "_id": "66cf2d1e8e4d5f123456789e",
    "title": "Latest Technology Trends in 2025",
    "content": "In this comprehensive guide, we explore the cutting-edge technologies that are shaping the future of business and society...",
    "link": "https://kayceylon.com/blog/tech-trends-2025",
    "photo": [
      {
        "url": "https://res.cloudinary.com/demo/image/upload/v1693234567/kayceylon/blogs/sample1.jpg",
        "public_id": "kayceylon/blogs/sample1",
        "_id": "66cf2d1e8e4d5f123456789f"
      }
    ],
    "createdAt": "2025-08-28T10:50:45.789Z",
    "__v": 0
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "No blog on that ID"
}
```

---

#### `PATCH /api/auth/updateBlog/:id`
**Purpose:** Update blog post (Admin only)  
**Auth:** Admin access token required  
**Content-Type:** `multipart/form-data` or `application/json`

**Request Headers:**
```
Authorization: Bearer <admin_access_token>
Content-Type: multipart/form-data
```

**Form Data (if updating with new photos):**
```
title: "Updated: Latest Technology Trends in 2025"
content: "Updated content with new insights..."
link: "https://kayceylon.com/blog/updated-tech-trends-2025"
photos: [new-file1.jpg] (optional - replaces all existing photos)
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "_id": "66cf2d1e8e4d5f123456789e",
    "title": "Updated: Latest Technology Trends in 2025",
    "content": "Updated content with new insights...",
    "link": "https://kayceylon.com/blog/updated-tech-trends-2025",
    "photo": [
      {
        "url": "https://res.cloudinary.com/demo/image/upload/v1693234570/kayceylon/blogs/updated1.jpg",
        "public_id": "kayceylon/blogs/updated1",
        "_id": "66cf2d1e8e4d5f12345678a1"
      }
    ],
    "createdAt": "2025-08-28T10:50:45.789Z",
    "updatedAt": "2025-08-28T11:15:30.123Z",
    "__v": 0
  }
}
```

---

#### `DELETE /api/auth/deleteBlog/:id`
**Purpose:** Delete blog post and associated images (Admin only)  
**Auth:** Admin access token required  

**Request Headers:**
```
Authorization: Bearer <admin_access_token>
```

**URL Parameters:**
- `id`: Blog ID (MongoDB ObjectId)

**Response (204 No Content):**
```
No response body
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "No blog found with that ID"
}
```

---

## 🔧 Postman Environment Variables

Create a Postman Environment with these variables:

```json
{
  "name": "Kayceylon API Environment",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "default"
    },
    {
      "key": "accessToken",
      "value": "",
      "type": "secret"
    },
    {
      "key": "adminEmail",
      "value": "admin@kayceylon.com",
      "type": "default"
    },
    {
      "key": "adminPassword",
      "value": "SecurePass123!",
      "type": "secret"
    }
  ]
}
```

---

## 🧪 Postman Test Scripts

### Auto-extract Access Token (Login/Register)
Add this to the **Tests** tab of login/register requests:

```javascript
pm.test("Status code is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test("Response has access token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('accessToken');
    
    // Store access token for future requests
    pm.environment.set("accessToken", jsonData.data.accessToken);
});

pm.test("Response structure is correct", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success', true);
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData).to.have.property('data');
});
```

### General API Tests
Add this to **Tests** tab of other requests:

```javascript
pm.test("Response time is less than 2000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test("Status code is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

pm.test("Content-Type is JSON", function () {
    if (pm.response.code !== 204) {
        pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
    }
});
```

### Auth Required Endpoints
Add this **Pre-request Script** to protected endpoints:

```javascript
// Check if access token exists
if (!pm.environment.get("accessToken")) {
    throw new Error("Access token not found. Please login first.");
}

// Set Authorization header
pm.request.headers.add({
    key: "Authorization",
    value: "Bearer " + pm.environment.get("accessToken")
});
```

---

## ❌ Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "All fields are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Role user is not authorized to access this route"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "No blog found with that ID"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Something went wrong"
}
```

---

## 🚀 Testing Workflow

### 1. Basic Setup
1. Import the Postman collection
2. Set up environment variables
3. Test the health endpoint

### 2. Authentication Flow
1. Register a new admin
2. Login with credentials
3. Test protected endpoints
4. Refresh token before expiry
5. Logout to clean up

### 3. Forms Testing
1. Submit a contact form (public)
2. Login as admin
3. Get all forms
4. Get specific form (marks as read)
5. Delete a form

### 4. Subscription Testing
1. Subscribe with email (public)
2. Try duplicate subscription (should fail)

### 5. Blog Management
1. Login as admin
2. Create blog with images
3. Get all blogs (public)
4. Get specific blog (public)
5. Update blog with new content/images
6. Delete blog

---

## 📝 Notes

- **File Uploads**: Use form-data for blog endpoints with photos
- **Cookies**: Refresh tokens are handled automatically by Postman
- **Rate Limiting**: Be aware of the 100 requests/15 minutes limit
- **Image Limits**: Maximum 6 photos per blog post
- **Email Notifications**: Emails are sent for form submissions and new blog posts

---

## 🔗 Postman Collection JSON

Import this JSON directly into Postman:

```json
{
  "info": {
    "name": "Kayceylon API",
    "description": "Complete API collection for Kayceylon backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/health"
      }
    },
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register Admin",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/register",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"John Admin\",\n  \"email\": \"admin@kayceylon.com\",\n  \"password\": \"SecurePass123!\",\n  \"role\": \"admin\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@kayceylon.com\",\n  \"password\": \"SecurePass123!\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Refresh Token",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/refresh"
          }
        },
        {
          "name": "Logout",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/logout",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

This comprehensive documentation provides everything needed to test the Kayceylon API using Postman with detailed examples, error scenarios, and testing workflows.
