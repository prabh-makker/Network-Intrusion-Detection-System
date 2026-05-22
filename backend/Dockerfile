# ============================================================
# Stage 1: Builder
# ============================================================
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies (minimal)
RUN apt-get update && apt-get install -y \
    curl \
    libpcap0.8 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY backend/ .

# Copy project root files so Docker infrastructure tests can run inside the container
RUN mkdir -p /nids_root/backend /nids_root/frontend /nids_root/sniffer
COPY docker-compose.yml /nids_root/docker-compose.yml
COPY backend/Dockerfile /nids_root/backend/Dockerfile
COPY frontend/Dockerfile /nids_root/frontend/Dockerfile
COPY sniffer/Dockerfile /nids_root/sniffer/Dockerfile
COPY backend/.dockerignore /nids_root/backend/.dockerignore
COPY frontend/.dockerignore /nids_root/frontend/.dockerignore
COPY sniffer/.dockerignore /nids_root/sniffer/.dockerignore
COPY frontend/next.config.ts /nids_root/frontend/next.config.ts
COPY .env.example /nids_root/.env.example
COPY .gitignore /nids_root/.gitignore

# Set PATH to use user-installed packages
ENV PATH=/root/.local/bin:$PATH

# Expose FastAPI port
EXPOSE 8001

# Health check: verify API is responding
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
    CMD curl -f http://localhost:8001/docs || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
