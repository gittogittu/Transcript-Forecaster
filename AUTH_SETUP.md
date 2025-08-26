# Authentication Setup Guide

This document explains how to configure and use the authentication system in the Transcript Analytics Platform.

## Overview

The authentication system is built with NextAuth.js and supports multiple OAuth providers:
- Auth0
- Google OAuth
- GitHub OAuth

## Environment Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Configure your OAuth providers in `.env.local`:

### Auth0 Setup
```env
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_ISSUER=https://your-domain.auth0.com
```

### Google OAuth Setup
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### GitHub OAuth Setup
```env
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

### NextAuth Configuration
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
```

## Components

### Authentication Components
- `LoginButton` - Handles OAuth sign-in
- `LogoutButton` - Handles sign-out
- `UserProfile` - Displays user information
- `ProtectedRoute` - Wraps components that require authentication
- `SessionProvider` - Provides session context

### Usage Examples

#### Basic Login Button
```tsx
import { LoginButton } from '@/components/auth'

<LoginButton provider="auth0" callbackUrl="/dashboard" />
```

#### Protected Route
```tsx
import { ProtectedRoute } from '@/components/auth'

<ProtectedRoute requiredRole="admin">
  <AdminContent />
</ProtectedRoute>
```

#### Using the Auth Hook
```tsx
import { useAuth } from '@/lib/hooks/use-auth'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <button onClick={() => login('auth0')}>Sign In</button>
  }
  
  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={() => logout()}>Sign Out</button>
    </div>
  )
}
```

## Routes

### Authentication Pages
- `/auth/signin` - Sign-in page with OAuth options
- `/auth/error` - Authentication error page
- `/unauthorized` - Access denied page

### Protected Routes
- `/dashboard` - Main dashboard (requires authentication)
- `/admin/*` - Admin routes (requires admin role)

## Middleware

The middleware automatically:
- Redirects unauthenticated users to `/auth/signin`
- Redirects authenticated users away from auth pages
- Enforces role-based access control
- Preserves the intended destination URL

## Testing

Run the authentication tests:
```bash
npm test
```

The test suite includes:
- Component unit tests
- Authentication hook tests
- Integration tests
- Role-based access control tests

## Security Features

- CSRF protection
- Secure session management
- Role-based access control
- Automatic token refresh
- Secure redirect handling
- Structured error handling with AuthenticationError types

## Error Handling

The authentication system uses structured error types for better debugging:

```typescript
interface AuthenticationError extends AppError {
  name: 'AuthenticationError'
  code: 'AUTH_ERROR'
}
```

All authentication errors include:
- Descriptive error messages
- Error codes for programmatic handling
- Timestamps for debugging
- Optional context for additional information

## Troubleshooting

### Common Issues

1. **"Configuration" error**: Check that all required environment variables are set
2. **"AccessDenied" error**: User doesn't have permission or OAuth app is misconfigured
3. **Redirect loops**: Check NEXTAUTH_URL matches your domain
4. **Session not persisting**: Verify NEXTAUTH_SECRET is set and consistent

### Debug Mode

Enable debug logging by adding to `.env.local`:
```env
NEXTAUTH_DEBUG=true
```

## Production Deployment

1. Set secure environment variables
2. Use HTTPS for NEXTAUTH_URL
3. Generate a strong NEXTAUTH_SECRET
4. Configure OAuth redirect URLs for production domain
5. Enable security headers in next.config.js