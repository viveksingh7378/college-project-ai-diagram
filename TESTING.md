# End-to-End Testing Guide

Step-by-step walkthrough to test the merged project from scratch on a **local Windows/Mac/Linux machine**. Covers three stages:

1. [Local docker-compose](#stage-1--local-docker-compose)
2. [Jenkins pipeline](#stage-2--jenkins-pipeline)
3. [Kubernetes (minikube)](#stage-3--kubernetes-minikube)

---

## 0. Prerequisites

| Tool          | Min version | Install                                                                 |
| ------------- | ----------- | ----------------------------------------------------------------------- |
| Git           | 2.30+       | https://git-scm.com/downloads                                           |
| Node.js       | 20.x        | https://nodejs.org/en/download                                          |
| Python        | 3.10+       | https://www.python.org/downloads                                        |
| Docker Desktop| 4.x         | https://www.docker.com/products/docker-desktop                          |
| Jenkins       | LTS         | https://www.jenkins.io/download (Docker install recommended)            |
| minikube      | latest      | https://minikube.sigs.k8s.io/docs/start                                 |
| kubectl       | latest      | https://kubernetes.io/docs/tasks/tools                                  |

**Accounts you need**
- DockerHub account: `vivek7378` (or change image names)
- GitHub account: `viveksingh7378` (or change in Jenkinsfile)
- **Groq API key** (primary analyzer) — free at https://console.groq.com/keys
  Groq's native JSON mode guarantees syntactically-valid responses, which
  is why the analyzer now uses Groq first (Gemini occasionally returned
  prose-mixed output that broke JSON parsing).
- Optional: Anthropic or Gemini key for the server's diagram generation
  and analyzer fallback.

---

## Stage 0 — Create the GitHub repo & push code

```bash
cd "merged-project"
git init -b main
git add .
git commit -m "Initial commit: merged fullstack AI diagram agent"

# Create the repo on GitHub (UI or gh CLI)
gh repo create viveksingh7378/college-project-ai-diagram --public --source . --remote origin --push

# Or manually:
# 1. Create empty repo on github.com/viveksingh7378/college-project-ai-diagram
# 2. Then:
git remote add origin https://github.com/viveksingh7378/college-project-ai-diagram.git
git push -u origin main
```

**Sanity check**: you should see `client/`, `server/`, `k8s/`, `Jenkinsfile`, `docker-compose.yml`, `ai_agent/` on GitHub.

---

## Stage 1 — Local docker-compose

This is the fastest way to verify the merge actually runs.

### 1a. Set up environment variables

```bash
cd merged-project
cp .env.example .env
```

Edit `.env` and set:
```env
JWT_SECRET=any_long_random_string_at_least_32_chars
GROQ_API_KEY=gsk_...                # primary — get one at console.groq.com
GEMINI_API_KEY=                     # optional fallback
ANTHROPIC_API_KEY=                  # optional
PLANTUML_SERVER=https://www.plantuml.com/plantuml/png
```

### 1b. Build and run

```bash
docker compose up -d --build
```

Watch the logs until all three services say "healthy":
```bash
docker compose ps
# Expected:
# NAME                         STATUS
# college-ai-diagram-client    Up (healthy)
# college-ai-diagram-server    Up (healthy)
# college-ai-diagram-mongo     Up (healthy)
```

### 1c. Smoke tests

Open a shell in a new terminal and run:

```bash
# 1. Server health
curl http://localhost:5000/api/health
# Expected: {"status":"ok","message":"AI Diagram Agent server is running"}

# 2. Client returns HTML
curl -s -o /dev/null -w "%{http_code}\n" http://localhost
# Expected: 200

# 3. Client proxies /api to server
curl http://localhost/api/health
# Expected: same JSON as the direct call

# 4. Mongo is reachable from the server container
docker exec college-ai-diagram-server sh -c 'wget -qO- http://localhost:5000/api/health'
```

### 1d. Browser test

Open http://localhost in a browser. You should see:
- Login/Register page renders (React app is served)
- Register a new user → redirects to home
- Type a prompt → diagram renders (this needs a valid AI key)

### 1e. Troubleshooting

| Symptom                                         | Fix                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `client` unhealthy, logs show "can't find dist" | Client build failed. Run `docker compose build client` to see errors.     |
| `server` logs: "MongoServerError: connect ECONNREFUSED" | Mongo not ready yet. `docker compose restart server`.             |
| Browser shows 502 on `/api/*`                   | Server crashed. Check `docker compose logs server`.                       |
| 401/403 on every request                        | `JWT_SECRET` mismatch, or token expired. Clear localStorage, re-login.    |
| AI request returns 500                          | Bad/missing AI key. Check server logs for the provider error.             |

Stop when done:
```bash
docker compose down          # keep data
docker compose down -v       # also wipe mongo volume
```

---

## Stage 2 — Jenkins pipeline

### 2a. Run Jenkins locally in Docker

```bash
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

Mounting the docker socket lets Jenkins run `docker build` inside its own container. On **Windows (Docker Desktop)** the socket path is the same; on **Mac** it also works.

Open http://localhost:8080, get the initial admin password:
```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Install the **suggested plugins** + these extras:
- Docker Pipeline
- NodeJS Plugin
- GitHub Integration

### 2b. Install Node + Python inside the Jenkins container

```bash
docker exec -u 0 jenkins bash -c '
apt-get update &&
apt-get install -y python3 python3-pip &&
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &&
apt-get install -y nodejs
'
```

### 2c. Add Jenkins credentials

Jenkins → Manage Jenkins → Credentials → System → Global → Add Credentials:

| ID                      | Type                   | Secret / value                                         |
| ----------------------- | ---------------------- | ------------------------------------------------------ |
| `GROQ_API_KEY`          | Secret text            | **Primary** — Groq key from console.groq.com/keys      |
| `GEMINI_API_KEY`        | Secret text            | Optional fallback (leave blank if you don't have one)  |
| `GITHUB_TOKEN`          | Secret text            | GitHub PAT with `repo` scope                           |
| `dockerhub-credentials` | Username with password | DockerHub username `vivek7378` and access token        |

Create the Groq key at https://console.groq.com/keys (free tier, no credit card).

Create the DockerHub access token at https://hub.docker.com/settings/security.

Create the GitHub PAT at https://github.com/settings/tokens (classic, `repo` scope).

### Why Groq for the analyzer?

Groq's Chat Completions API supports `response_format={"type": "json_object"}`
which makes the model's output **guaranteed-valid JSON**. The previous
Gemini-based analyzer occasionally returned responses like:

```
Here is the analysis:
```json
{...}
```

That prose-mixed output broke `json.loads()` and caused the CI stage to
fail with `JSONDecodeError: Expecting value: line 1 column 1 (char 0)`.
Groq's JSON mode eliminates that class of syntax error at the source.

### 2d. Create the pipeline job

Jenkins → New Item → **Pipeline** → name `college-project-ai-diagram` → OK.

In the job config:
- **Pipeline** → Definition: `Pipeline script from SCM`
- SCM: Git
- Repo URL: `https://github.com/viveksingh7378/college-project-ai-diagram.git`
- Credentials: select GitHub PAT (if repo is private)
- Branch: `*/main`
- Script path: `Jenkinsfile`

Save → **Build Now**.

### 2e. Expected pipeline output

```
Stage: Reset AI Retry Counter   ✓
Stage: Checkout                 ✓
Stage: AI Code Analysis         ✓ (skipped gracefully if key missing)
Stage: Install Dependencies     ✓ (parallel: client + server)
Stage: Lint & Build             ✓ (parallel)
Stage: Docker Build             ✓
Stage: Docker Push              ✓ (only on main branch)
Stage: Deploy                   ✓ (docker-compose OR k8s)
```

After a green build, confirm images landed on DockerHub:
- https://hub.docker.com/r/vivek7378/college-ai-diagram-client
- https://hub.docker.com/r/vivek7378/college-ai-diagram-server

### 2f. Jenkins troubleshooting

| Symptom                                          | Fix                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `docker: command not found`                      | Step 2a mount missing. Recreate jenkins container with the socket.    |
| `npm: command not found`                         | Step 2b didn't install Node. Re-run.                                  |
| `unauthorized: authentication required` on push  | Wrong DockerHub creds. Use an access token (not password).           |
| AI analyzer fails with "GitHub token lacks write"| PAT needs `Contents: Read and Write` (fine-grained) or `repo` (classic). |

---

## Stage 3 — Kubernetes (minikube)

### 3a. Start minikube

```bash
minikube start --cpus=2 --memory=4g --driver=docker
kubectl config current-context   # should show "minikube"
```

### 3b. Create secrets

Never commit real keys. Apply via kubectl:

```bash
kubectl apply -f k8s/namespace.yaml

kubectl -n ai-diagram create secret generic server-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=GROQ_API_KEY="YOUR_GROQ_KEY" \
  --from-literal=GEMINI_API_KEY="" \
  --from-literal=ANTHROPIC_API_KEY="" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 3c. Apply the rest

```bash
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/server.yaml
kubectl apply -f k8s/client.yaml
```

The `Secret` block inside `k8s/server.yaml` will be overwritten by your `create secret` above — that's intentional.

### 3d. Watch rollout

```bash
kubectl -n ai-diagram get pods -w
# Wait for all 3 pods to be 1/1 Running

kubectl -n ai-diagram get svc
```

### 3e. Access the client

On minikube the `LoadBalancer` service type needs a tunnel:

```bash
minikube service client -n ai-diagram
# opens the browser at http://<minikube-ip>:<nodeport>
```

### 3f. k8s troubleshooting

| Symptom                                | Fix                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Pod stuck in `ImagePullBackOff`        | Images not on DockerHub yet. Finish Stage 2 first. Or set `imagePullPolicy: Never` and load images: `minikube image load vivek7378/college-ai-diagram-client`. |
| Pod `CrashLoopBackOff`                 | `kubectl -n ai-diagram logs <pod>` — usually missing env var.              |
| `server` can't reach mongo             | Ensure `mongo` service is up first: `kubectl -n ai-diagram get svc mongo`. |
| LoadBalancer pending forever           | Normal on minikube. Use `minikube service client -n ai-diagram` to tunnel. |

Tear down:
```bash
kubectl delete namespace ai-diagram
minikube stop
```

---

## Verifying "proper connections" end-to-end

Run this one-liner after the docker-compose stack is up — it exercises every connection in the merged project:

```bash
printf "1. Server health:         " && curl -s http://localhost:5000/api/health | head -c 80 && echo
printf "2. Client serves SPA:     " && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost/
printf "3. Client -> Server proxy: " && curl -s http://localhost/api/health | head -c 80 && echo
printf "4. Server -> Mongo:       " && docker exec college-ai-diagram-server node -e "const m=require('mongoose'); m.connect(process.env.MONGODB_URI).then(()=>console.log('ok')).catch(e=>console.log('FAIL:'+e.message))"
```

All four should print OK-looking output. If any fail, the matching troubleshooting table above tells you where to look.
