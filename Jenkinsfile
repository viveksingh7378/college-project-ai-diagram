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

        // ── 3. AI CODE ANALYSIS (optional — runs if GEMINI_API_KEY exists) ────
        stage('AI Code Analysis') {
            when {
                expression { return fileExists('ai_agent/analyzer.py') }
            }
            steps {
                sh 'pip3 install -r requirements.txt --quiet --break-system-packages || pip3 install -r requirements.txt --quiet'
                script {
                    // GROQ_API_KEY is the primary provider (native JSON mode → no syntax errors).
                    // GEMINI_API_KEY is optional — used as a fallback if Groq is unreachable.
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
                                python3 ai_agent/analyzer.py 2>&1 | tee analysis_output.txt || true
                            ''',
                            returnStatus: true
                        )
                        echo "AI analyzer exit code: ${code}"
                    }
                }
            }
        }

        // ── 4. INSTALL DEPS (parallel) ────────────────────────────────────────
        stage('Install Dependencies') {
            parallel {
                stage('client deps') {
                    steps {
                        dir('client') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('server deps') {
                    steps {
                        dir('server') {
                            sh 'npm ci'
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
        stage('Docker Push') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                        docker push ${IMG_CLIENT}:${GIT_COMMIT_SHORT}
                        docker push ${IMG_CLIENT}:latest
                        docker push ${IMG_SERVER}:${GIT_COMMIT_SHORT}
                        docker push ${IMG_SERVER}:latest
                        docker logout
                    '''
                }
            }
        }

        // ── 8. DEPLOY (docker compose OR kubernetes) ──────────────────────────
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                script {
                    if (fileExists('k8s/namespace.yaml')) {
                        echo "Deploying to Kubernetes"
                        sh '''
                            kubectl apply -f k8s/namespace.yaml
                            kubectl apply -f k8s/
                            kubectl -n ai-diagram rollout restart deployment/client || true
                            kubectl -n ai-diagram rollout restart deployment/server || true
                        '''
                    } else {
                        echo "Deploying via docker-compose"
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
