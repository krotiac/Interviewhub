# InterviewHub

InterviewHub is a full-stack technical interview platform designed for conducting collaborative coding interviews with real-time communication and code execution.

It provides an environment where interviewers and candidates can work together, write and execute code, and conduct technical interviews through a shared platform.

## Features

- Real-time collaborative interview environment
- In-browser code editor
- Multi-language code execution
- Real-time communication between interview participants
- Interview session management
- Backend API for application logic
- Sandboxed code execution
- Database-backed application state
- Docker-based development environment

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Monaco Editor

### Backend

- Node.js
- TypeScript
- Express
- Socket.IO
- Prisma
- PostgreSQL

### Code Execution

- Sandboxed execution environment
- Docker
- C++

### Infrastructure

- Docker Compose
- REST APIs
- WebSockets

## Architecture

```text
                    InterviewHub
                         │
              ┌──────────┴──────────┐
              │                     │
          Frontend               Backend
          Next.js                Node.js
              │                     │
              │              ┌──────┴──────┐
              │              │             │
              │          REST API      Socket.IO
              │              │             │
              │              └──────┬──────┘
              │                     │
              │                  Prisma
              │                     │
              │                  Database
              │
              │
              └──── Code Execution ────→ Sandbox
                                         │
                                         ↓
                                    C++ / Programs
