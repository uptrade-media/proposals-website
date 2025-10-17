---
description: Repository Information Overview
alwaysApply: true
---

# Proposals Website Information

## Summary
A client portal web application for Uptrade Media that handles proposals, projects, files, messages, and billing. The application allows clients to view and accept proposals, manage projects, upload/download files, communicate with the team, and handle invoices.

## Structure
- **src/** - Frontend React application code
  - **components/** - UI components
  - **pages/** - Page components and routes
  - **lib/** - Zustand stores and utilities
  - **db/** - Database schema and utilities
  - **proposals/** - MDX proposal content
- **netlify/** - Serverless backend functions
  - **functions/** - Netlify Functions for API endpoints
- **tests/** - Test files for components, functions, and stores
- **public/** - Static assets
- **scripts/** - Utility scripts for development

## Language & Runtime
**Language**: JavaScript/TypeScript
**Version**: ES Modules (type: "module")
**Frontend Framework**: React 19
**Build System**: Vite 7
**Package Manager**: pnpm 10.4.1

## Dependencies
**Main Dependencies**:
- React 19.2.0 with React Router 7.9.4
- Zustand 5.0.8 for state management
- Tailwind CSS 4.1.14 for styling
- shadcn/ui components (Radix UI)
- MDX 3.1.1 for proposal content
- Drizzle ORM 0.44.6 with Neon Postgres
- JWT/Jose for authentication
- Resend 6.1.2 for email
- Square 43.1.0 for payments
- Netlify Blobs for file storage

**Development Dependencies**:
- Vite 7.1.9 for development and building
- Vitest 3.2.4 for testing
- ESLint 9.37.0 for linting
- TypeScript 5.9.3 for type checking

## Build & Installation
```bash
# Install dependencies
pnpm install

# Development server
pnpm dev                # Frontend only (Vite)
netlify dev             # Frontend + Functions

# Build for production
pnpm build              # Outputs to dist/
```

## Testing
**Framework**: Vitest with React Testing Library
**Test Location**: tests/ directory
**Naming Convention**: *.test.js/jsx
**Configuration**: tests/setup.js
**Run Command**:
```bash
pnpm test               # Run all tests
pnpm test:watch         # Watch mode
pnpm test:coverage      # With coverage
```

## Backend Architecture
**Platform**: Netlify Functions (serverless)
**Database**: Neon Postgres with Drizzle ORM
**Authentication**: JWT in HttpOnly cookies
**File Storage**: Netlify Blobs
**Email**: Resend API
**Payments**: Square API

## Database Schema
**Main Tables**:
- **contacts**: Users with authentication info
- **projects**: Client projects with budget tracking
- **proposals**: MDX proposals with signatures
- **files**: File metadata with Netlify Blobs storage
- **messages**: Threaded messaging system
- **invoices**: Square payment integration

## Authentication
**Methods**:
- Google OAuth (via google-auth-library)
- Password-based (bcrypt)
- Magic links (email)
- Account setup flow

**Security**:
- HttpOnly cookies for session management
- JWT tokens for authentication
- Edge function protection for proposal routes