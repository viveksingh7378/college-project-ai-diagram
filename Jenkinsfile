// ─────────────────────────────────────────────────────────────────────────────
//  Jenkins Pipeline — College AI Diagram Project
//  ───────────────────────────────────────────────
//
//  REQUIRED JENKINS CREDENTIALS (Manage Jenkins → Credentials → System →
//  Global → Add Credentials). The IDs MUST match exactly — they are case
//  sensitive and referenced by name below.
//
//   ┌──────────────────────────┬────────────────────────┬───────────────────┐
//   │  Credential ID           │  Kind                  │  Where to get it  │
//   ├──────────────────────────┼────────────────────────┼───────────────────┤
//   │  GROQ_API_KEY            │  Secret text           │ console.groq.com/keys │
//   │  GEMINI_API_KEY          │  Secret text (optional)│ ai.google.dev     │
//   │  GITHUB_TOKEN            │  Secret text           │ github.com/settings/tokens │
//   │  dockerhub-credentials   │  Username + password   │ hub.docker.com (use access token, not password) │
//   └──────────────────────────┴────────────────────────┴───────────────────┘
//
//  TO UPDATE THE GROQ KEY:
//    Manage Jenkins → Credentials → (global) → click  GROQ_API_KEY
//      → Update → paste new gsk_... key into Secret → Save
//
//  AI_AUTO_PUSH:
//    Default = false. The AI analyzer detects + reports issues but does NOT
//    commit/push fixes to GitHub. Flip to "true" only after you've watched
//    a couple of clean dry-runs and trust the safety filters.
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    environment {
        DOCKER_USER       = "vivek7378"
        GIT_COMMIT_SHORT  = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()

        // Image names for the merged fullstack app
        IMG_CLIENT  = "vivek7378/college-ai-diagram-client"
        IMG_SERVER  = "vivek7378/college-ai-diagram-server"

        // GitHub repo
        GITHUB_REPO = "viveksingh7378/college-project-ai-diagram"

        // Node version used by both client and server
        NODE_VERSION = "20"

        // ── AI analyzer behaviour ────────────────────────────────────────
        // "false" → analyzer reports + applies fixes locally only (safe demo mode)
        // "true"  → analyzer commits + pushes successful fixes back to GitHub
        AI_AUTO_PUSH = "true"

        // Hard wall-clock cap for the AI Code Analysis stage. The analyzer
        // honours this and will stop gracefully after the budget elapses.
        AI_ANALYSIS_BUDGET_SECS = "600"
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 60, unit: 'MINUTES')
    }

    stages {

        // ── 1. RESET ──────────────────────────────────────────────────────────
        stage('Reset AI Retry Counter') {
            steps {
                sh 'rm -f ai_agent/.ai_retry_count'
            }
        }

        // ── 2. CHECKOUT ───────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ── 3. AI CODE ANALYSIS ───────────────────────────────────────────────
        // Runs the multi-provider analyzer (Groq → Gemini → Ollama). It scans
        // every source file, detects syntax errors, and applies fixes. With
        // AI_AUTO_PUSH=true the bot will also commit + push the fixes.
        stage('AI Code Analysis') {
            when {
                expression { return fileExists('ai_agent/analyzer.py') }
            }
            steps {
                // pip's --break-system-packages flag was added in pip 23.0.
                // On older systems it errors out, so we fall back gracefully.
                sh '''
                    pip3 install -r requirements.txt --quiet --break-system-packages \
                      || pip3 install -r requirements.txt --quiet \
                      || pip3 install --user -r requirements.txt --quiet
                '''

                script {
                    withCredentials([
                        string(credentialsId: 'GROQ_API_KEY',   variable: 'GROQ_API_KEY'),
                        string(credentialsId: 'GEMINI_API_KEY', variable: 'GEMINI_API_KEY'),
                        string(credentialsId: 'GITHUB_TOKEN',   variable: 'GITHUB_TOKEN')
                    ]) {
                        sh '''
                            git config user.email "ai-bot@pipeline.local"
                            git config user.name  "AI-Remediation-Bot"
                        '''
                        def code = sh(
                            script: '''
                                GROQ_API_KEY=$GROQ_API_KEY \
                                GEMINI_API_KEY=$GEMINI_API_KEY \
                                GITHUB_TOKEN=$GITHUB_TOKEN \
                                AI_PROVIDER=${AI_PROVIDER:-} \
                                AI_AUTO_PUSH=${AI_AUTO_PUSH} \
                                AI_ANALYSIS_BUDGET_SECS=${AI_ANALYSIS_BUDGET_SECS} \
                                python3 ai_agent/analyzer.py 2>&1 | tee analysis_output.txt || true
                            ''',
                            returnStatus: true
                        )
                        echo "AI analyzer exit code: ${code}  (AI_AUTO_PUSH=${env.AI_AUTO_PUSH})"
                    }
                }
            }
        }

        // ── 4. INSTALL DEPS (parallel) ────────────────────────────────────────
        // `npm ci` is faster + deterministic but requires a valid lockfile.
        // If the lockfile is missing/corrupt (e.g. an AI auto-fix went wrong),
        // we fall back to `npm install` so the build doesn't fail outright.
        stage('Install Dependencies') {
            parallel {
                stage('client deps') {
                    steps {
                        dir('client') {
                            sh 'npm ci || npm install'
                        }
                    }
                }
                stage('server deps') {
                    steps {
                        dir('server') {
                            sh 'npm ci || npm install'
                        }
                    }
                }
            }
        }

        // ── 5. LINT + BUILD (parallel) ────────────────────────────────────────
        stage('Lint & Build') {
            parallel {
                stage('client build') {
                    steps {
                        dir('client') {
                            sh 'npm run build'
                        }
                    }
                }
                stage('server lint') {
                    steps {
                        dir('server') {
                            // No lint script today — smoke-check syntax with node
                            sh 'node --check index.js'
                        }
                    }
                }
            }
        }

        // ── 6. DOCKER BUILD ───────────────────────────────────────────────────
        stage('Docker Build') {
            steps {
                sh """
                    docker build -t ${IMG_CLIENT}:${GIT_COMMIT_SHORT} -t ${IMG_CLIENT}:latest ./client
                    docker build -t ${IMG_SERVER}:${GIT_COMMIT_SHORT} -t ${IMG_SERVER}:latest ./server
                """
            }
        }

        // ── 7. DOCKER PUSH ────────────────────────────────────────────────────
        // Login is done ONCE manually on the host machine
        // (`docker login -u vivek7378` with an access token from
        // hub.docker.com/settings/security). Credentials are then cached in
        // ~/.docker/config.json and reused on every build — no more
        // login/logout cycle per build. We only re-run docker login if
        // ~/.docker/config.json doesn't have a saved auth (first-time setup
        // on a fresh Jenkins installation).
        stage('Docker Push') {
            when {
                expression {
                    def b = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    return b == 'main' || b.endsWith('/main')
                }
            }
            steps {
                script {
                    // Check if we're already logged in to DockerHub.
                    // `docker info` reports `Username: ...` when authenticated
                    // (works on Mac/Keychain, Linux, Windows — any backend).
                    def loggedIn = sh(
                        script: 'docker info 2>/dev/null | grep -q "^ Username:"',
                        returnStatus: true
                    ) == 0

                    if (!loggedIn) {
                        echo "No cached DockerHub credentials — logging in (one-time)..."
                        withCredentials([usernamePassword(
                            credentialsId: 'dockerhub-credentials',
                            usernameVariable: 'DOCKER_USERNAME',
                            passwordVariable: 'DOCKER_PASSWORD'
                        )]) {
                            sh 'echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin'
                        }
                    } else {
                        echo "✓ Using cached DockerHub credentials"
                    }

                    sh """
                        docker push ${IMG_CLIENT}:${GIT_COMMIT_SHORT}
                        docker push ${IMG_CLIENT}:latest
                        docker push ${IMG_SERVER}:${GIT_COMMIT_SHORT}
                        docker push ${IMG_SERVER}:latest
                    """
                    // NOTE: no `docker logout` — we want creds to persist for
                    // the next build. To force a re-login, run:
                    //   docker logout    (on the Jenkins host)
                }
            }
        }

        // ── 8. DEPLOY (docker compose OR kubernetes) ──────────────────────────
        stage('Deploy') {
            when {
                // Works for BOTH multibranch jobs (BRANCH_NAME is set) and
                // "Pipeline script from SCM" jobs (BRANCH_NAME is null but
                // GIT_BRANCH is "origin/main"). The previous `branch 'main'`
                // gate only worked for multibranch and silently skipped the
                // stage in single-branch jobs.
                expression {
                    def b = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    return b == 'main' || b.endsWith('/main')
                }
            }
            steps {
                script {
                    if (fileExists('k8s/namespace.yaml') && sh(script: 'command -v kubectl >/dev/null 2>&1 && kubectl cluster-info >/dev/null 2>&1', returnStatus: true) == 0) {
                        echo "Deploying to Kubernetes"
                        sh '''
                            kubectl apply -f k8s/namespace.yaml
                            kubectl apply -f k8s/
                            kubectl -n ai-diagram rollout restart deployment/client || true
                            kubectl -n ai-diagram rollout restart deployment/server || true
                        '''
                    } else {
                        echo "Deploying via docker-compose (kubectl unreachable or no manifests)"
                        sh '''
                            docker compose pull || true
                            docker compose up -d --build
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline SUCCESS — built & pushed ${IMG_CLIENT}:${GIT_COMMIT_SHORT} and ${IMG_SERVER}:${GIT_COMMIT_SHORT}"
        }
        failure {
            echo "Pipeline FAILED — check logs above. AI analyzer output is in analysis_output.txt (if produced)."
        }
        always {
            archiveArtifacts artifacts: 'analysis_output.txt', allowEmptyArchive: true
            sh 'docker image prune -f || true'
        }
    }
}
