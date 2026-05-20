# jBoilerplate

A modern Vue 3 boilerplate with TypeScript and Shadcn UI.

## Features

- 🚀 [Vue 3](https://v3.vuejs.org/) with [Composition API](https://v3.vuejs.org/guide/composition-api-introduction.html)
- 🔥 [TypeScript](https://www.typescriptlang.org/) for type safety
- 🎨 [Shadcn UI](https://ui.shadcn.com/) with customizable components
- 📦 [Pinia](https://pinia.vuejs.org/) for state management
- 🔄 [Vue Router](https://router.vuejs.org/) with route guards
- 🌐 [Vue I18n](https://vue-i18n.intlify.dev/) for internationalization
- 🎭 Dark mode with system preference detection
- 🚦 Form validation with Vuelidate
- 📱 Responsive design
- 📈 Dashboard components and layouts
- 🛠️ Admin and SuperAdmin interfaces
- ⚡ Vite for lightning-fast development
- 🐳 Docker deployment options
- 🛠️ CLI for easy setup

## Prerequisites

- Node.js 16+
- pnpm 8+
- Docker and Docker Compose (for containerized deployment)

## Quick Start

### Using the CLI (Recommended)

```bash
# Install dependencies
pnpm install

# Run the setup CLI
pnpm run cli:setup
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Copy environment template and adjust as needed
cp .env.example .env

# Start the dev server
pnpm run dev
```

### Docker

```bash
# Build and run the app container
pnpm run docker:up

# Or use the standalone (Coolify-friendly) compose file
pnpm run docker:app-only
```

## Development

```bash
# Start development server
pnpm run dev

# Build for production (runs vue-tsc --noEmit then vite build)
pnpm run build

# Lint
pnpm run lint

# Run tests
pnpm run test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENVIRONMENT` | App environment (`development`, `production`) | `development` |
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000/api` |
| `VITE_API_TIMEOUT` | API request timeout in ms | `30000` |
| `VITE_API_RETRIES` | Number of API retry attempts | `3` |
| `VITE_PLUNK_API_KEY` | Plunk email service API key | _(none)_ |
| `VITE_DEFAULT_FROM_EMAIL` | Default sender email | _(none)_ |
| `VITE_UMAMI_WEBSITE_ID` | Umami analytics website ID | _(none)_ |
| `VITE_UMAMI_URL` | Umami analytics endpoint | _(none)_ |
| `VITE_FEATURE_*` | Feature flags (see `.env.example`) | varies |
| `WEB_PORT` | Host port to expose the container on | `3100` |

See `.env.example` for the full list.

## Project Structure

```
jBoilerplate/
├── cli/                   # CLI tool for project setup
├── public/                # Static assets
├── src/
│   ├── assets/            # Application assets
│   ├── components/        # Vue components
│   │   └── ui/            # Shadcn UI components
│   ├── composables/       # Vue composables
│   ├── constants/         # Application constants
│   ├── layouts/           # Page layouts
│   ├── lib/               # Utilities and libraries
│   ├── locales/           # I18n translation files
│   ├── pages/             # Application pages
│   │   ├── admin/         # Admin pages
│   │   └── superadmin/    # SuperAdmin pages
│   ├── plugins/           # Vue plugins
│   ├── router/            # Vue Router configuration
│   ├── services/          # API and other services
│   ├── stores/            # Pinia stores
│   └── types/             # TypeScript type definitions
├── templates/             # Project templates
├── components.json        # Shadcn UI configuration
├── docker-compose.yml     # App container compose
├── docker-compose.app-only.yml # App-only compose (Coolify)
└── vite.config.mts        # Vite configuration
```

## License

MIT
