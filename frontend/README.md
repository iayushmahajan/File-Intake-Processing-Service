# Dashboard frontend

React + TypeScript + Vite + Tailwind dashboard for the File Intake & Data Quality Platform.

See the [repository README](../README.md) for architecture, configuration, backend setup and scoring semantics.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`VITE_API_BASE_URL` configures the API. Browser tests require `backend/.venv` and use isolated temporary backend storage. Shared types live in `src/types/jobs.ts`; `src/lib/api.ts` centralizes HTTP configuration. Papa Parse handles quoted multiline CSV previews.
