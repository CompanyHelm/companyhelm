# Code conventions

## Config
- use env variables VITE_, add a file src/config.ts that resolves the env variables into a typed config

## Directory structure
- keep `src/main.tsx` as the browser bootstrap only, it should mount the root app and load global css, no feature logic
- keep `src/app.tsx` as the top level application shell and route orchestration, do not turn it into a dumping ground for feature specific helpers
- keep route level screens under `src/pages`, one page per file, and move page specific child files into a directory under `src/pages/{page_name}` once the page stops being a single file
- keep auth only code under `src/auth`, including API clients, session state, guards, and auth specific types
- keep Relay runtime wiring and GraphQL transport code under `src/relay`; generated artifacts or operation specific files should live next to the feature that owns them once they exist
- keep shared browser configuration in `src/config.ts` until it grows enough to justify a `src/config/` directory
- keep global styles in `src/index.css`; if a page or feature needs substantial isolated styling, colocate it with that feature instead of expanding the global stylesheet indefinitely
- keep static assets that are served as files under `public/`; importable assets that belong to a single feature should live beside that feature in `src`
- avoid adding broad bucket folders like `utils`, `helpers`, or `components`; create directories by feature or responsibility so ownership stays obvious
- when a feature grows, prefer `src/{feature}/{feature}.tsx` plus nearby support files instead of scattering related files across many top level directories
