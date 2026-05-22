# ============================================================
# Stage 1: Builder
# ============================================================
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies for scapy
RUN apt-get update && apt-get install -y \
    gcc \
    libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
# Note: libpcap-dev is not needed at runtime, only libpcap library
RUN apt-get update && apt-get install -y \
    libpcap0.8 \
    tcpdump \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY . .

# Set PATH to use user-installed packages
ENV PATH=/root/.local/bin:$PATH

# Set environment variables for sniffer
ENV PYTHONUNBUFFERED=1

# Health check: verify can reach backend API (slim image has no pgrep/ps)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=20s \
    CMD curl -f -s -o /dev/null http://nids-backend:8001/docs || exit 1

# Use mock generator (Docker can't sniff host packets reliably on Win/Mac)
# Set SNIFFER_MODE=real to use scapy sniffer instead (Linux only)
CMD ["sh", "-c", "if [ \"$SNIFFER_MODE\" = \"real\" ]; then python sniffer.py; else python mock_generator.py; fi"]
