# Code conventions

## Config
- use env variables VITE_, add a file src/config.ts that resolves the env variables into a typed config

## Directory structure
- no more than 1 file per component
- components should be under src/compoments
- related components should be moved under sub directories
- app.tsx should not contain any page/component, it should be as simple as possible
- pages should go under src/pages and nested dirs if the route for the page is nested