# Arnés de pruebas de interfaz (solo desarrollo)
Se creó porque el entorno de trabajo no tenía acceso a npm/Vite. Compila con esbuild y *shims* (`shims/`), levanta un servidor que imita PostgREST/Auth sobre PostgreSQL real (`fake-supabase-server.mjs`) y maneja la app con Playwright.
No sustituye una prueba contra Supabase real. Requiere PostgreSQL local, esbuild y Playwright; no forma parte de `npm run build`.
