# Puma Printables Platform

This workspace houses the full-stack Puma Printables order approval system.

## Stack Overview

- **Backend**: Spring Boot (Java 17) with Maven, JWT authentication, Spring Security, PostgreSQL persistence, and Spring Mail notifications.
- **Frontend**: React 18 with Vite, React Router, Redux Toolkit, Axios, and Material UI.
- **Database**: PostgreSQL with Liquibase-managed migrations and JSONB-heavy domain entities.
- **Infrastructure**: Docker Compose for local orchestration, plus scripts for database seeding and SMTP emulation.

## Module Layout

- `backend/` contains the Spring Boot API project.
- `frontend/` contains the Vite React client.
- `infrastructure/` provides database migrations, Docker, and environment automation.
- `docs/` stores diagrams and specifications produced during implementation.

Each milestone will land in its own commit with clear history to mirror a senior engineer's delivery cadence.

## Documentation

- `docs/architecture.md` captures the technology stack, environment setup, schema design, and API contract that drive the implementation that follows.
