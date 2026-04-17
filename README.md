# AI Diagram Agent — Merged Fullstack Project

Merged project combining the **ai-diagram-agent** React + Vite + Node.js stack with the **Jenkins + Docker + Kubernetes** infrastructure from the ShopEasy project. The legacy Flask e-commerce microservices have been removed.

**Repo**: `viveksingh7378/college-project-ai-diagram`
**Images**: `vivek7378/college-ai-diagram-client`, `vivek7378/college-ai-diagram-server`

See [TESTING.md](./TESTING.md) for step-by-step end-to-end test instructions (local → Jenkins → k8s).

## Stack

| Layer     | Tech                                                         |
| --------- | ------------------------------------------------------------ |
| Frontend  | React 18, Vite 5, Tailwind CSS, React Router                 |
| Backend   | Node.js 20, Express 4, Mongoose (MongoDB)                    |
| AI        | Anthropic, Google Gemini, Groq, PlantUML encoder             |
| Database  | MongoDB 7                                                    |
| CI/CD     | Jenkins (with optional Gemini-powered AI code analyzer)      |
| Runtime   | Docker + docker-compose, Kubernetes manifests                |

## Folder layout

```
merged-project/
├── client/             # React + Vite frontend
│   ├── Dockerfile      # multi-stage: vite build + nginx
│   ├── nginx.conf      # SPA routing + /api proxy to server
│   └── src/
├── server/             # Node.js + Express backend
│   ├── Dockerfile
│   ├── index.js
│   ├── routes/ controllers/ models/ middleware/
│   ├── agent/ prompts/ config/
│   └── .env.example
├── ai_agent/           # Python AI code analyzer (used by Jenkins CI)
│   ├── analyzer.py
│   ├── remediate.py
│   ├── validator.py
│   └── log_parser.py
├── k8s/                # Kubernetes manifests
│   ├── namespace.yaml
│   ├── mongo.yaml
│   ├── server.yaml
│   ├── client.yaml
│   └── ingress.yaml
├── Jenkinsfile         # Pipeline: AI analysis → install → build → docker → deploy
├── docker-compose.yml  # Local/EC2 deployment (client + server + mongo)
├── requirements.txt    # Python deps for ai_agent
├── .env.example
└── .gitignore
```

## Quick start — local development

Prerequisites: Node.js 20+, MongoDB running locally (or use the compose stack).

```bash
# 1. Backend
cd server
cp .env.example .env            # fill in JWT_SECRET and at least one AI key
npm install
npm run dev                      # runs on http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                      # runs on http://localhost:5173
```

The client talks to the server at `http://localhost:5000/api/*` (configure in `client/src/services/` or via `VITE_API_URL`).

## Quick start — Docker Compose

```bash
cp .env.example .env             # fill in JWT_SECRET + AI keys
docker compose up -d --build
docker compose logs -f
```

Services:
- Client:  http://localhost (port 80)
- Server:  http://localhost:5000/api/health
- Mongo:   localhost:27017

Stop & clean:
```bash
docker compose down              # stop
docker compose down -v           # also remove mongo volume
```

## Kubernetes deployment

```bash
# 1. Update k8s/server.yaml → server-secrets with real values
# 2. Apply everything
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/server.yaml
kubectl apply -f k8s/client.yaml

# Optional: ingress (requires nginx-ingress controller)
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl -n ai-diagram get pods,svc
```

The `client` service is type `LoadBalancer` by default — change to `ClusterIP` if using the Ingress.

## Jenkins CI/CD

The `Jenkinsfile` runs these stages:

1. **Reset AI retry counter** — ensures the analyzer starts fresh
2. **Checkout** — SCM checkout
3. **AI Code Analysis** — runs `ai_agent/analyzer.py` using Gemini (optional, skipped if analyzer missing)
4. **Install Dependencies** — `npm ci` for client + server in parallel
5. **Lint & Build** — `npm run build` (client) and `node --check` (server) in parallel
6. **Docker Build** — builds `vivek7378/college-ai-diagram-client` and `vivek7378/college-ai-diagram-server`
7. **Docker Push** — pushes tags `latest` and `${GIT_COMMIT_SHORT}` to DockerHub (main branch only)
8. **Deploy** — `kubectl apply -f k8s/` if k8s manifests exist, else `docker compose up -d`

### Required Jenkins credentials

| Credential ID          | Type              | Purpose                                     |
| ---------------------- | ----------------- | ------------------------------------------- |
| `GEMINI_API_KEY`       | Secret text       | Gemini key for `ai_agent/analyzer.py`       |
| `GITHUB_TOKEN`         | Secret text       | PAT for AI analyzer to push remediation     |
| `dockerhub-credentials`| Username/password | DockerHub login for pushing images          |

## Environment variables (server)

See `server/.env.example`. Required vars:

- `PORT` — default `5000`
- `MONGODB_URI` — e.g. `mongodb://localhost:27017/ai-diagram-agent`
- `CLIENT_URL` — CORS origin, e.g. `http://localhost:5173`
- `JWT_SECRET` — long random string
- `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `GROQ_API_KEY` — at least one
- `PLANTUML_SERVER` — defaults to `https://www.plantuml.com/plantuml/png`

## What changed vs. the originals

Removed from `Project/myapp`:
- Flask microservices (product, order, user, payment)
- Static HTML frontend (`blog.html`, `new-features.html`)
- ShopEasy-specific `deploy_ec2.sh`, `start_services.sh`, `stop_services.sh`
- Old `Dockerfile` (replaced by per-service Dockerfiles)

Kept and adapted:
- `Jenkinsfile` — rewritten for Node/React pipeline, AI analyzer stage preserved
- `k8s/` — new manifests for client/server/mongo (old ShopEasy yamls removed)
- `ai_agent/` — copied intact; used in Jenkins AI Code Analysis stage
- `requirements.txt` — trimmed to just the analyzer's deps (`google-genai`, `requests`)

From `ai-diagram-agent`:
- `client/` and `server/` copied as-is (minus `node_modules` and `.env`)
- Added `Dockerfile` + `nginx.conf` to each
