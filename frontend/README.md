# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

````js
export default defineConfig([
  # Puma Printables Frontend

  React + TypeScript single-page app that surfaces the Puma Printables demo platform. It consumes the Spring Boot backend for authentication, orders, product catalog, and reporting data while presenting the Apple-inspired dark UI.

  ## Prerequisites

  - Node.js 20+ (comes with npm 10)
  - Backend service running locally on `http://localhost:8080` (see `../backend/README.md`)

  ## Setup

  ```bash
  cd frontend
  npm install
  cp .env.example .env.local        # optional, only if you need to override defaults
````

`VITE_API_BASE_URL` defaults to `http://localhost:8080`. Override it in `.env.local` when pointing at a different backend instance.

## Development workflow

```bash
npm run dev -- --host   # start Vite dev server at http://localhost:5173
npm run lint            # lint TypeScript/React code
npm run build           # create production build in dist/
npm run preview         # serve the production build locally
```

The dev server expects the backend (and its Postgres container) to be running. Use credentials seeded by the backend initializer, for example:

- `store.manager@puma.com` / `PumaDemo!23`
- `approver.lead@puma.com` / `PumaDemo!23`

## Feature highlights

- Auth flow with JWT verification, automatic expiry handling, and protected routes.
- Dark theme layout with glass surfaces, responsive navigation, and reduced-motion fallbacks.
- Orders, Products, and Reports pages wired to `/api/v1` endpoints with filtering, metrics, and loading/error states.
- Demo verification animation on successful sign-in for additional polish.

## Project structure

```
src/
  components/        # shared layout and route guards
  hooks/             # auth state management
  pages/             # Orders, Products, Reports, Login screens
  services/          # REST client for backend APIs
  types/             # shared TypeScript models
```

## Conventions

- Keep UI palette and spacing constants in `src/index.css`.
- Use fetch helpers from `src/services/api.ts` for backend access.
- Prefer `:focus-visible` styles and aria-labels for accessibility.
- Run `npm run lint` before committing front-end changes.

For backend setup, refer to `../backend/README.md`.
