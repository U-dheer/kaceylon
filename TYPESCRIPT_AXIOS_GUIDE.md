# Kayceylon API - TypeScript + Axios Integration Guide

## 📋 Table of Contents
1. [Setup & Installation](#setup--installation)
2. [TypeScript Types & Interfaces](#typescript-types--interfaces)
3. [Axios Configuration](#axios-configuration)
4. [Authentication Service](#authentication-service)
5. [API Service Classes](#api-service-classes)
6. [Usage Examples](#usage-examples)
7. [Error Handling](#error-handling)
8. [File Upload Examples](#file-upload-examples)
9. [React Integration](#react-integration)
10. [Best Practices](#best-practices)

---

## 🛠 Setup & Installation

### Install Dependencies

```bash
npm install axios
npm install -D @types/node typescript
```

### Project Structure
```
src/
├── types/
│   ├── api.types.ts
│   ├── auth.types.ts
│   ├── blog.types.ts
│   └── form.types.ts
├── services/
│   ├── api.service.ts
│   ├── auth.service.ts
│   ├── blog.service.ts
│   └── form.service.ts
├── utils/
│   ├── axios-config.ts
│   └── error-handler.ts
└── examples/
    └── usage-examples.ts
```

---

## 🔷 TypeScript Types & Interfaces

### Core API Types

```typescript
// src/types/api.types.ts

// Base API Response Structure
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  status?: string;
  results?: number;
}

// Error Response
export interface ApiError {
  success: false;
  message: string;
  stack?: string;
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// API Configuration
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  withCredentials: boolean;
}
```

### Authentication Types

```typescript
// src/types/auth.types.ts

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface LoginResponse {
  admin: User;
  accessToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### Form Types

```typescript
// src/types/form.types.ts

export interface ContactForm {
  _id?: string;
  cNameOrName: string;
  email: string;
  message: string;
  phone: string;
  address: string;
  read?: boolean;
  createdAt?: string;
  __v?: number;
}

export interface ContactFormRequest {
  cNameOrName: string;
  email: string;
  message: string;
  phone: string;
  address: string;
}

export interface GetFormsResponse {
  status: string;
  results: number;
  data: ContactForm[];
}

export interface EmailSubscription {
  _id?: string;
  email: string;
  createdAt?: string;
  __v?: number;
}

export interface SubscriptionRequest {
  email: string;
}
```

### Blog Types

```typescript
// src/types/blog.types.ts

export interface BlogPhoto {
  url: string;
  public_id: string;
  _id?: string;
}

export interface Blog {
  _id?: string;
  title: string;
  content: string;
  link: string;
  photo: BlogPhoto[];
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface BlogRequest {
  title: string;
  content: string;
  link: string;
}

export interface CreateBlogRequest extends BlogRequest {
  photos: File[];
}

export interface UpdateBlogRequest extends Partial<BlogRequest> {
  photos?: File[];
}

export interface GetBlogsResponse {
  status: string;
  results: number;
  data: Blog[];
}
```

---

## ⚙️ Axios Configuration

### Base Axios Configuration

```typescript
// src/utils/axios-config.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '../types/api.types';

class AxiosConfig {
  private instance: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      withCredentials: true, // Important for refresh token cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add access token to requests
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        // Log request for debugging
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params,
        });

        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        console.log(`✅ ${response.status} ${response.config.url}`, response.data);
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            // Retry original request with new token
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearToken();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        console.error(`❌ ${error.response?.status} ${error.config?.url}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  public setToken(token: string): void {
    this.accessToken = token;
  }

  public clearToken(): void {
    this.accessToken = null;
  }

  public getToken(): string | null {
    return this.accessToken;
  }

  private async refreshToken(): Promise<void> {
    try {
      const response = await this.instance.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
      const newToken = response.data.data?.accessToken;
      
      if (newToken) {
        this.setToken(newToken);
        // Save to localStorage for persistence
        localStorage.setItem('accessToken', newToken);
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      await this.instance.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const axiosConfig = new AxiosConfig();
export const apiClient = axiosConfig.getInstance();
```

---

## 🔐 Authentication Service

```typescript
// src/services/auth.service.ts

import { AxiosResponse } from 'axios';
import { apiClient, axiosConfig } from '../utils/axios-config';
import { 
  LoginRequest, 
  RegisterRequest, 
  LoginResponse, 
  RefreshTokenResponse,
  User 
} from '../types/auth.types';
import { ApiResponse } from '../types/api.types';

export class AuthService {
  
  /**
   * Register a new admin account
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<ApiResponse<LoginResponse>> = await apiClient.post(
        '/auth/register',
        data
      );

      const { admin, accessToken } = response.data.data!;
      
      // Store token
      axiosConfig.setToken(accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(admin));

      return { admin, accessToken };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<ApiResponse<LoginResponse>> = await apiClient.post(
        '/auth/login',
        credentials
      );

      const { admin, accessToken } = response.data.data!;
      
      // Store token and user data
      axiosConfig.setToken(accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(admin));

      return { admin, accessToken };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token cookie
   */
  async refreshToken(): Promise<string> {
    try {
      const response: AxiosResponse<ApiResponse<RefreshTokenResponse>> = await apiClient.post(
        '/auth/refresh'
      );

      const { accessToken } = response.data.data!;
      
      // Update token
      axiosConfig.setToken(accessToken);
      localStorage.setItem('accessToken', accessToken);

      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout and clear all tokens
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with cleanup even if request fails
    } finally {
      // Always clear local data
      this.clearAuthData();
    }
  }

  /**
   * Clear all authentication data
   */
  clearAuthData(): void {
    axiosConfig.clearToken();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }

  /**
   * Initialize auth state from localStorage
   */
  initializeAuth(): { user: User | null; accessToken: string | null } {
    const accessToken = localStorage.getItem('accessToken');
    const userJson = localStorage.getItem('user');
    
    let user: User | null = null;
    
    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('user');
      }
    }

    if (accessToken) {
      axiosConfig.setToken(accessToken);
    }

    return { user, accessToken };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = axiosConfig.getToken();
    return !!token;
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Export singleton instance
export const authService = new AuthService();
```

---

## 📝 Form Service

```typescript
// src/services/form.service.ts

import { AxiosResponse } from 'axios';
import { apiClient } from '../utils/axios-config';
import { 
  ContactForm, 
  ContactFormRequest, 
  GetFormsResponse,
  EmailSubscription,
  SubscriptionRequest 
} from '../types/form.types';
import { ApiResponse } from '../types/api.types';

export class FormService {

  /**
   * Submit a contact form (public endpoint)
   */
  async submitContactForm(formData: ContactFormRequest): Promise<ContactForm> {
    try {
      const response: AxiosResponse<ApiResponse<ContactForm>> = await apiClient.post(
        '/auth/makeAForm',
        formData
      );

      return response.data.data!;
    } catch (error) {
      console.error('Form submission failed:', error);
      throw error;
    }
  }

  /**
   * Get all contact forms (Admin only)
   */
  async getAllForms(): Promise<ContactForm[]> {
    try {
      const response: AxiosResponse<GetFormsResponse> = await apiClient.get('/auth/getAllForms');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get forms:', error);
      throw error;
    }
  }

  /**
   * Get a specific contact form and mark as read (Admin only)
   */
  async getOneForm(formId: string): Promise<ContactForm> {
    try {
      const response: AxiosResponse<ApiResponse<ContactForm>> = await apiClient.get(
        `/auth/getOneForm/${formId}`
      );

      return response.data.data!;
    } catch (error) {
      console.error('Failed to get form:', error);
      throw error;
    }
  }

  /**
   * Delete a contact form (Admin only)
   */
  async deleteForm(formId: string): Promise<void> {
    try {
      await apiClient.delete(`/auth/deleteForm/${formId}`);
    } catch (error) {
      console.error('Failed to delete form:', error);
      throw error;
    }
  }

  /**
   * Subscribe to newsletter (public endpoint)
   */
  async subscribeToNewsletter(subscriptionData: SubscriptionRequest): Promise<EmailSubscription> {
    try {
      const response: AxiosResponse<ApiResponse<EmailSubscription>> = await apiClient.post(
        '/auth/callToAction',
        subscriptionData
      );

      return response.data.data!;
    } catch (error) {
      console.error('Newsletter subscription failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const formService = new FormService();
```

---

## 📰 Blog Service

```typescript
// src/services/blog.service.ts

import { AxiosResponse } from 'axios';
import { apiClient } from '../utils/axios-config';
import { 
  Blog, 
  CreateBlogRequest, 
  UpdateBlogRequest,
  GetBlogsResponse 
} from '../types/blog.types';
import { ApiResponse } from '../types/api.types';

export class BlogService {

  /**
   * Create a new blog post with images (Admin only)
   */
  async createBlog(blogData: CreateBlogRequest): Promise<Blog> {
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', blogData.title);
      formData.append('content', blogData.content);
      formData.append('link', blogData.link);
      
      // Add photo files
      blogData.photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      const response: AxiosResponse<ApiResponse<Blog>> = await apiClient.post(
        '/auth/makeABlog',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.data!;
    } catch (error) {
      console.error('Blog creation failed:', error);
      throw error;
    }
  }

  /**
   * Get all blog posts (public endpoint)
   */
  async getAllBlogs(): Promise<Blog[]> {
    try {
      const response: AxiosResponse<GetBlogsResponse> = await apiClient.get('/auth/getAllBlogs');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get blogs:', error);
      throw error;
    }
  }

  /**
   * Get a specific blog post (public endpoint)
   */
  async getOneBlog(blogId: string): Promise<Blog> {
    try {
      const response: AxiosResponse<ApiResponse<Blog>> = await apiClient.get(
        `/auth/getOneBlog/${blogId}`
      );

      return response.data.data!;
    } catch (error) {
      console.error('Failed to get blog:', error);
      throw error;
    }
  }

  /**
   * Update a blog post (Admin only)
   */
  async updateBlog(blogId: string, updateData: UpdateBlogRequest): Promise<Blog> {
    try {
      let requestData: FormData | UpdateBlogRequest;
      let headers: any = {};

      // Check if we have photos to upload
      if (updateData.photos && updateData.photos.length > 0) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        if (updateData.title) formData.append('title', updateData.title);
        if (updateData.content) formData.append('content', updateData.content);
        if (updateData.link) formData.append('link', updateData.link);
        
        updateData.photos.forEach((photo) => {
          formData.append('photos', photo);
        });

        requestData = formData;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Use JSON for text-only updates
        const { photos, ...textData } = updateData;
        requestData = textData;
        headers['Content-Type'] = 'application/json';
      }

      const response: AxiosResponse<ApiResponse<Blog>> = await apiClient.patch(
        `/auth/updateBlog/${blogId}`,
        requestData,
        { headers }
      );

      return response.data.data!;
    } catch (error) {
      console.error('Blog update failed:', error);
      throw error;
    }
  }

  /**
   * Delete a blog post (Admin only)
   */
  async deleteBlog(blogId: string): Promise<void> {
    try {
      await apiClient.delete(`/auth/deleteBlog/${blogId}`);
    } catch (error) {
      console.error('Failed to delete blog:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const blogService = new BlogService();
```

---

## 🚫 Error Handling

```typescript
// src/utils/error-handler.ts

import { AxiosError } from 'axios';
import { ApiError } from '../types/api.types';

export interface ErrorInfo {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class ApiErrorHandler {
  
  static handleError(error: unknown): ErrorInfo {
    if (error instanceof AxiosError) {
      const axiosError = error as AxiosError<ApiError>;
      
      // Server responded with error status
      if (axiosError.response) {
        const { status, data } = axiosError.response;
        
        return {
          message: data?.message || `HTTP ${status} Error`,
          status,
          code: axiosError.code,
          details: data,
        };
      }
      
      // Request was made but no response
      if (axiosError.request) {
        return {
          message: 'Network error - no response from server',
          code: axiosError.code,
        };
      }
      
      // Something else happened
      return {
        message: axiosError.message || 'Request configuration error',
        code: axiosError.code,
      };
    }
    
    // Non-Axios error
    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }
    
    // Unknown error type
    return {
      message: 'An unknown error occurred',
      details: error,
    };
  }

  static getErrorMessage(error: unknown): string {
    const errorInfo = this.handleError(error);
    return errorInfo.message;
  }

  static isNetworkError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return !!(error.request && !error.response);
    }
    return false;
  }

  static isAuthError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 401;
    }
    return false;
  }

  static isValidationError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 400;
    }
    return false;
  }

  static isRateLimitError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 429;
    }
    return false;
  }
}
```

---

## 📖 Usage Examples

### Basic Usage Examples

```typescript
// src/examples/usage-examples.ts

import { authService } from '../services/auth.service';
import { formService } from '../services/form.service';
import { blogService } from '../services/blog.service';
import { ApiErrorHandler } from '../utils/error-handler';

// Initialize authentication
async function initializeApp() {
  try {
    // Check if user was previously logged in
    const { user, accessToken } = authService.initializeAuth();
    
    if (user && accessToken) {
      console.log('User already authenticated:', user);
    } else {
      console.log('User not authenticated');
    }
  } catch (error) {
    console.error('App initialization failed:', error);
  }
}

// Authentication Examples
async function authenticationExamples() {
  try {
    // Register new admin
    const registerData = {
      name: 'John Admin',
      email: 'admin@example.com',
      password: 'SecurePass123!',
      role: 'admin' as const,
    };

    const registrationResult = await authService.register(registerData);
    console.log('Registration successful:', registrationResult);

    // Login
    const loginData = {
      email: 'admin@example.com',
      password: 'SecurePass123!',
    };

    const loginResult = await authService.login(loginData);
    console.log('Login successful:', loginResult);

    // Check authentication status
    const isAuth = authService.isAuthenticated();
    console.log('Is authenticated:', isAuth);

    // Get current user
    const currentUser = authService.getCurrentUser();
    console.log('Current user:', currentUser);

    // Logout
    await authService.logout();
    console.log('Logout successful');

  } catch (error) {
    const errorMessage = ApiErrorHandler.getErrorMessage(error);
    console.error('Authentication error:', errorMessage);
  }
}

// Form Examples
async function formExamples() {
  try {
    // Submit contact form
    const contactData = {
      cNameOrName: 'John Doe Company',
      email: 'contact@example.com',
      message: 'I\'m interested in your services.',
      phone: '+1-555-123-4567',
      address: '123 Business St, City, State 12345',
    };

    const submittedForm = await formService.submitContactForm(contactData);
    console.log('Form submitted:', submittedForm);

    // Subscribe to newsletter
    const subscriptionData = {
      email: 'subscriber@example.com',
    };

    const subscription = await formService.subscribeToNewsletter(subscriptionData);
    console.log('Newsletter subscription:', subscription);

    // Admin operations (requires authentication)
    await authService.login({
      email: 'admin@example.com',
      password: 'SecurePass123!',
    });

    // Get all forms
    const allForms = await formService.getAllForms();
    console.log('All forms:', allForms);

    // Get specific form
    if (allForms.length > 0) {
      const specificForm = await formService.getOneForm(allForms[0]._id!);
      console.log('Specific form:', specificForm);

      // Delete form
      await formService.deleteForm(allForms[0]._id!);
      console.log('Form deleted');
    }

  } catch (error) {
    const errorMessage = ApiErrorHandler.getErrorMessage(error);
    console.error('Form operation error:', errorMessage);
  }
}

// Blog Examples
async function blogExamples() {
  try {
    // Get all blogs (public)
    const allBlogs = await blogService.getAllBlogs();
    console.log('All blogs:', allBlogs);

    // Get specific blog (public)
    if (allBlogs.length > 0) {
      const specificBlog = await blogService.getOneBlog(allBlogs[0]._id!);
      console.log('Specific blog:', specificBlog);
    }

    // Admin operations (requires authentication)
    await authService.login({
      email: 'admin@example.com',
      password: 'SecurePass123!',
    });

    // Create blog with images
    const blogData = {
      title: 'My New Blog Post',
      content: 'This is the content of my blog post...',
      link: 'https://example.com/my-blog-post',
      photos: [], // Add File objects here
    };

    // Note: In a real application, you'd get File objects from file input
    // const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    // blogData.photos = Array.from(fileInput.files || []);

    const newBlog = await blogService.createBlog(blogData);
    console.log('Blog created:', newBlog);

    // Update blog
    const updateData = {
      title: 'Updated Blog Title',
      content: 'Updated content...',
    };

    const updatedBlog = await blogService.updateBlog(newBlog._id!, updateData);
    console.log('Blog updated:', updatedBlog);

    // Delete blog
    await blogService.deleteBlog(newBlog._id!);
    console.log('Blog deleted');

  } catch (error) {
    const errorMessage = ApiErrorHandler.getErrorMessage(error);
    console.error('Blog operation error:', errorMessage);
  }
}

// File Upload Example
async function fileUploadExample() {
  try {
    // This would typically be called from a file input change event
    const handleFileUpload = async (files: FileList) => {
      const fileArray = Array.from(files);
      
      // Validate files
      const validFiles = fileArray.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
        return isImage && isValidSize;
      });

      if (validFiles.length === 0) {
        throw new Error('No valid image files selected');
      }

      if (validFiles.length > 6) {
        throw new Error('Maximum 6 files allowed');
      }

      // Create blog with uploaded files
      const blogData = {
        title: 'Blog with Images',
        content: 'This blog post contains uploaded images.',
        link: 'https://example.com/blog-with-images',
        photos: validFiles,
      };

      const result = await blogService.createBlog(blogData);
      console.log('Blog created with images:', result);
      
      return result;
    };

    // Example usage:
    // const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    // fileInput.addEventListener('change', (event) => {
    //   const files = (event.target as HTMLInputElement).files;
    //   if (files) {
    //     handleFileUpload(files);
    //   }
    // });

  } catch (error) {
    const errorMessage = ApiErrorHandler.getErrorMessage(error);
    console.error('File upload error:', errorMessage);
  }
}

// Error Handling Examples
async function errorHandlingExamples() {
  try {
    // This will fail if not authenticated
    await formService.getAllForms();
  } catch (error) {
    const errorInfo = ApiErrorHandler.handleError(error);
    
    if (ApiErrorHandler.isAuthError(error)) {
      console.log('Authentication required - redirecting to login');
      // Redirect to login page
    } else if (ApiErrorHandler.isValidationError(error)) {
      console.log('Validation error:', errorInfo.message);
      // Show validation errors to user
    } else if (ApiErrorHandler.isRateLimitError(error)) {
      console.log('Rate limit exceeded - please try again later');
      // Show rate limit message
    } else if (ApiErrorHandler.isNetworkError(error)) {
      console.log('Network error - check your connection');
      // Show network error message
    } else {
      console.log('Unknown error:', errorInfo.message);
      // Show generic error message
    }
  }
}

// Export all examples
export {
  initializeApp,
  authenticationExamples,
  formExamples,
  blogExamples,
  fileUploadExample,
  errorHandlingExamples,
};
```

---

## ⚛️ React Integration

### Custom Hooks

```typescript
// src/hooks/useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { User, LoginRequest, RegisterRequest } from '../types/auth.types';
import { ApiErrorHandler } from '../utils/error-handler';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = () => {
      try {
        const { user: savedUser } = authService.initializeAuth();
        setUser(savedUser);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const { admin } = await authService.login(credentials);
      setUser(admin);
    } catch (error) {
      const errorMessage = ApiErrorHandler.getErrorMessage(error);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const { admin } = await authService.register(data);
      setUser(admin);
    } catch (error) {
      const errorMessage = ApiErrorHandler.getErrorMessage(error);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      const errorMessage = ApiErrorHandler.getErrorMessage(error);
      setError(errorMessage);
      console.error('Logout error:', errorMessage);
      // Clear local state even if logout request fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
}
```

### Form Hook

```typescript
// src/hooks/useContactForm.ts

import { useState } from 'react';
import { formService } from '../services/form.service';
import { ContactFormRequest } from '../types/form.types';
import { ApiErrorHandler } from '../utils/error-handler';

interface UseContactFormReturn {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  submitForm: (data: ContactFormRequest) => Promise<void>;
  reset: () => void;
}

export function useContactForm(): UseContactFormReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitForm = async (data: ContactFormRequest) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await formService.submitContactForm(data);
      setSuccess(true);
    } catch (error) {
      const errorMessage = ApiErrorHandler.getErrorMessage(error);
      setError(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    isSubmitting,
    error,
    success,
    submitForm,
    reset,
  };
}
```

### React Components

```typescript
// src/components/LoginForm.tsx

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(formData);
      console.log('Login successful');
    } catch (error) {
      console.error('Login failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

```typescript
// src/components/ContactForm.tsx

import React, { useState } from 'react';
import { useContactForm } from '../hooks/useContactForm';

export const ContactForm: React.FC = () => {
  const { submitForm, isSubmitting, error, success, reset } = useContactForm();
  const [formData, setFormData] = useState({
    cNameOrName: '',
    email: '',
    message: '',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await submitForm(formData);
      // Reset form on success
      setFormData({
        cNameOrName: '',
        email: '',
        message: '',
        phone: '',
        address: '',
      });
    } catch (error) {
      console.error('Form submission failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <div>
        <h3>Thank you for your message!</h3>
        <p>We'll get back to you soon.</p>
        <button onClick={reset}>Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="cNameOrName">Name/Company:</label>
        <input
          type="text"
          id="cNameOrName"
          name="cNameOrName"
          value={formData.cNameOrName}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="phone">Phone:</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="address">Address:</label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="message">Message:</label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          required
        />
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};
```

---

## 🎯 Best Practices

### 1. **Type Safety**
```typescript
// Always use proper TypeScript types
const response: AxiosResponse<ApiResponse<User>> = await apiClient.get('/auth/user');

// Use type guards for runtime checks
function isApiError(error: unknown): error is AxiosError<ApiError> {
  return error instanceof AxiosError && !!error.response;
}
```

### 2. **Error Handling**
```typescript
// Centralized error handling
try {
  const result = await someApiCall();
  return result;
} catch (error) {
  const errorInfo = ApiErrorHandler.handleError(error);
  
  // Log error for debugging
  console.error('API Error:', errorInfo);
  
  // Show user-friendly message
  toast.error(errorInfo.message);
  
  // Re-throw if needed
  throw error;
}
```

### 3. **Request Cancellation**
```typescript
// Use AbortController for request cancellation
const abortController = new AbortController();

const fetchData = async () => {
  try {
    const response = await apiClient.get('/data', {
      signal: abortController.signal,
    });
    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log('Request cancelled');
    } else {
      throw error;
    }
  }
};

// Cancel request when component unmounts
useEffect(() => {
  return () => {
    abortController.abort();
  };
}, []);
```

### 4. **Request Retries**
```typescript
// Implement retry logic for failed requests
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Only retry on network errors or 5xx status codes
      if (ApiErrorHandler.isNetworkError(error) || 
          (error instanceof AxiosError && 
           error.response?.status && 
           error.response.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
};
```

### 5. **Caching Strategy**
```typescript
// Simple cache implementation
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new ApiCache();

// Use cache in service methods
async getAllBlogs(useCache: boolean = true): Promise<Blog[]> {
  const cacheKey = 'blogs:all';
  
  if (useCache) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const blogs = await blogService.getAllBlogs();
  apiCache.set(cacheKey, blogs);
  
  return blogs;
}
```

### 6. **Environment Configuration**
```typescript
// src/config/environment.ts

interface ApiConfig {
  baseURL: string;
  timeout: number;
  enableLogging: boolean;
}

const development: ApiConfig = {
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  enableLogging: true,
};

const production: ApiConfig = {
  baseURL: 'https://api.kayceylon.com/api',
  timeout: 15000,
  enableLogging: false,
};

export const apiConfig = process.env.NODE_ENV === 'production' ? production : development;
```

---

## 📋 Summary

This comprehensive guide provides:

✅ **Complete TypeScript types** for all API endpoints  
✅ **Robust Axios configuration** with interceptors  
✅ **Service classes** for organized API calls  
✅ **Authentication management** with token refresh  
✅ **Error handling** with detailed error types  
✅ **File upload support** for blog images  
✅ **React hooks** for easy integration  
✅ **Best practices** for production use  

The implementation follows TypeScript best practices, provides comprehensive error handling, and includes real-world examples for immediate use in your applications.
