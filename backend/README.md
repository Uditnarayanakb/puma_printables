# Puma Printables Backend

Spring Boot 3 service that exposes the order approval APIs, integrates with PostgreSQL,
and delivers notification emails. The project targets Java 17 and follows a layered layout
(domain, service, web, security) to keep responsibilities crisp.

## Tech Highlights

- Spring Boot starters: Web, Security, Data JPA, Validation, Actuator, Mail
- Liquibase-managed PostgreSQL schema with JSONB and rich constraints
- OAuth2 resource server starter for JWT-based stateless authentication
- PostgreSQL driver with Hibernate configured for UTC timestamps and JSONB columns
- Lombok and configuration processor to reduce boilerplate while preserving metadata

## Local Development

```powershell
cd backend
./mvnw.cmd clean verify
./mvnw.cmd spring-boot:run
```

> **Tip:** If Docker Desktop is installed, integration tests will launch a disposable PostgreSQL
> container. Without Docker, the tests are automatically skipped so the build still succeeds.

Environment defaults reside in `src/main/resources/application.yml`. Override them with environment
variables when running locally:

| Variable                            | Purpose                     | Default                                            |
| ----------------------------------- | --------------------------- | -------------------------------------------------- |
| `SPRING_DATASOURCE_URL`             | JDBC URL                    | `jdbc:postgresql://localhost:5432/puma_printables` |
| `SPRING_DATASOURCE_USERNAME`        | Database user               | `postgres`                                         |
| `SPRING_DATASOURCE_PASSWORD`        | Database password           | `postgres`                                         |
| `SPRING_MAIL_HOST`                  | SMTP host                   | `localhost`                                        |
| `SPRING_MAIL_PORT`                  | SMTP port                   | `1025`                                             |
| `JWT_SECRET`                        | HMAC key for token signing  | `change-me-in-prod`                                |
| `JWT_EXPIRY_MINUTES`                | Token TTL                   | `60`                                               |
| `PUMA_NOTIFICATIONS_ENABLED`        | Toggle emails on/off        | `true`                                             |
| `PUMA_NOTIFICATIONS_FROM`           | From address for emails     | `notifications@pumaprintables.local`               |
| `PUMA_NOTIFY_APPROVERS_ON_CREATION` | CC approvers for new orders | `true`                                             |

## Project Structure

- `com.pumaprintables.platform.config` – shared Spring configuration
- `com.pumaprintables.platform.security` – JWT configuration and auth adapters
- `com.pumaprintables.platform.domain` – entity and repository contracts
- `com.pumaprintables.platform.domain.model` captures `User`, `Product`, `Order`, approval workflow entities, and enumerations mapped to the Liquibase schema
- `com.pumaprintables.platform.domain.repository` provides Spring Data repositories with focused finders for upcoming services
- `com.pumaprintables.platform.service` – business logic orchestrations
- `com.pumaprintables.platform.web` – controllers and DTOs

Subsequent commits will flesh out the models, repositories, and endpoints incrementally.
