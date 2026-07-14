# SpectraMind

SpectraMind is organized as a two-application repository:

```text
spectramind/   React and Vite frontend
backend/       Node.js, Fastify, Prisma, and PostgreSQL backend
```

The frontend source of truth is `spectramind/src`. There is intentionally no
second frontend under the repository root.

## Run locally

Start PostgreSQL, then run the backend in one terminal:

```bash
cd backend
npm install
npm run db:generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Run the frontend in a second terminal:

```bash
cd spectramind
npm install
npm run dev
```

To connect the frontend to the API, set this in `spectramind/.env`:

```env
VITE_API_URL=http://127.0.0.1:4000
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:4000`
- API documentation: `http://127.0.0.1:4000/api/docs`

## Build and test

```bash
cd backend
npm test
npm run build

cd ../spectramind
npm run build
```

## Backend container

The backend image must be built from the repository root so it can include the
framework library owned by the frontend project:

```bash
docker build -f backend/Dockerfile -t spectramind-backend .
```

The image packages `spectramind/src/core/framework-library` at
`/app/framework-library`. Set this in the deployed container:

```env
FRAMEWORK_LIBRARY_PATH=/app/framework-library
```

See `backend/README.md` for the complete API, database, security, testing, and
cloud-deployment documentation.
