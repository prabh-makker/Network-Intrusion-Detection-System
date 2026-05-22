"""Docker and Infrastructure Tests

Tests:
- Docker image builds
- Container health checks
- Service orchestration
- Volume management
- Network connectivity
- Environment configuration
- Resource limits

These tests require the project root (containing docker-compose.yml).
They are skipped automatically when run from inside a container.
"""
import pytest
import subprocess
import json
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Project-root detection — walk up from this file to find docker-compose.yml
# ---------------------------------------------------------------------------
def _find_project_root() -> Path | None:
    # Fixed location used when tests run inside the Docker container
    known = Path("/nids_root")
    if (known / "docker-compose.yml").exists():
        return known
    # Walk up from this file (works when running from host project root)
    current = Path(__file__).resolve().parent
    for _ in range(10):
        if (current / "docker-compose.yml").exists():
            return current
        current = current.parent
    return None

PROJECT_ROOT = _find_project_root()

# Change CWD to project root so relative Path("backend/Dockerfile") works
if PROJECT_ROOT:
    os.chdir(PROJECT_ROOT)

_needs_root = pytest.mark.skipif(
    PROJECT_ROOT is None,
    reason="Skipped: docker-compose.yml not found — run from project root"
)


@_needs_root
class TestDockerfileValidity:
    """Test Dockerfile configurations"""

    def test_backend_dockerfile_exists(self):
        """Verify backend Dockerfile exists"""
        dockerfile = Path("backend/Dockerfile")
        assert dockerfile.exists()

    def test_frontend_dockerfile_exists(self):
        """Verify frontend Dockerfile exists"""
        dockerfile = Path("frontend/Dockerfile")
        assert dockerfile.exists()

    def test_sniffer_dockerfile_exists(self):
        """Verify sniffer Dockerfile exists"""
        dockerfile = Path("sniffer/Dockerfile")
        assert dockerfile.exists()

    def test_dockerignore_backend_exists(self):
        """Verify backend .dockerignore exists"""
        dockerignore = Path("backend/.dockerignore")
        assert dockerignore.exists()

    def test_dockerignore_frontend_exists(self):
        """Verify frontend .dockerignore exists"""
        dockerignore = Path("frontend/.dockerignore")
        assert dockerignore.exists()

    def test_dockerignore_sniffer_exists(self):
        """Verify sniffer .dockerignore exists"""
        dockerignore = Path("sniffer/.dockerignore")
        assert dockerignore.exists()


@_needs_root
class TestDockerCompose:
    """Test docker-compose configuration"""

    def test_docker_compose_exists(self):
        """Verify docker-compose.yml exists"""
        compose_file = Path("docker-compose.yml")
        assert compose_file.exists()

    def test_docker_compose_valid_yaml(self):
        """Verify docker-compose.yml is valid YAML"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        assert config is not None
        assert "services" in config

    def test_docker_compose_has_backend(self):
        """Verify docker-compose includes backend service"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        assert "backend" in config["services"]

    def test_docker_compose_has_frontend(self):
        """Verify docker-compose includes frontend service"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        assert "frontend" in config["services"]

    def test_docker_compose_has_sniffer(self):
        """Verify docker-compose includes sniffer service"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        assert "sniffer" in config["services"]

    def test_backend_service_config(self):
        """Verify backend service configuration"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        backend = config["services"]["backend"]

        # Should have required properties
        assert "build" in backend or "image" in backend
        assert "ports" in backend
        assert "environment" in backend
        assert "volumes" in backend

    def test_frontend_service_config(self):
        """Verify frontend service configuration"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        frontend = config["services"]["frontend"]

        # Should have required properties
        assert "build" in frontend or "image" in frontend
        assert "ports" in frontend

    def test_sniffer_service_config(self):
        """Verify sniffer service configuration"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        sniffer = config["services"]["sniffer"]

        # Should have required properties
        assert "build" in sniffer or "image" in sniffer
        assert "environment" in sniffer

    def test_health_checks_configured(self):
        """Verify health checks are configured"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        backend = config["services"].get("backend", {})
        frontend = config["services"].get("frontend", {})

        # At least backend should have health check
        assert "healthcheck" in backend or "health_check" in backend


@_needs_root
class TestVolumesAndNetworking:
    """Test volume and network configuration"""

    def test_shared_model_volume(self):
        """Verify shared model volume is configured"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        volumes = config.get("volumes", {})
        # Should have nids-models or similar
        assert any("model" in vol.lower() for vol in volumes)

    def test_database_volume(self):
        """Verify database volume is configured"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        volumes = config.get("volumes", {})
        # Should have database volume
        assert any("db" in vol.lower() for vol in volumes)

    def test_network_configured(self):
        """Verify custom network is configured"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        networks = config.get("networks", {})
        # Should have custom network for service communication
        assert len(networks) > 0

    def test_service_dependencies(self):
        """Verify service dependencies are configured"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        # Frontend should depend on backend
        frontend = config["services"].get("frontend", {})
        if "depends_on" in frontend:
            assert "backend" in str(frontend["depends_on"])


class TestEnvironmentConfiguration:
    """Test environment configuration"""

    def test_env_example_exists(self):
        """Verify .env.example exists"""
        env_file = Path(".env.example")
        assert env_file.exists()

    def test_env_example_has_required_vars(self):
        """Verify .env.example has all required variables"""
        with open(".env.example", "r") as f:
            content = f.read()

        required_vars = [
            "SECRET_KEY",
            "DATABASE_URL",
            "ENVIRONMENT",
            "CORS_ORIGINS"
        ]

        for var in required_vars:
            assert var in content

    def test_env_in_gitignore(self):
        """Verify .env is in .gitignore"""
        gitignore_path = Path(".gitignore")
        if gitignore_path.exists():
            with open(".gitignore", "r") as f:
                content = f.read()

            assert ".env" in content or ".env.local" in content


@_needs_root
class TestResourceLimits:
    """Test resource limit configuration"""

    def test_backend_resource_limits(self):
        """Verify backend has resource limits"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        backend = config["services"]["backend"]

        # Should have deploy resources or mem_limit
        assert ("deploy" in backend and "resources" in backend["deploy"]) or "mem_limit" in backend

    def test_frontend_resource_limits(self):
        """Verify frontend has resource limits"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        frontend = config["services"]["frontend"]

        # Should have deploy resources or mem_limit
        assert ("deploy" in frontend and "resources" in frontend["deploy"]) or "mem_limit" in frontend

    def test_sniffer_resource_limits(self):
        """Verify sniffer has resource limits"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        sniffer = config["services"]["sniffer"]

        # Should have deploy resources or mem_limit
        assert ("deploy" in sniffer and "resources" in sniffer["deploy"]) or "mem_limit" in sniffer


@_needs_root
class TestBackendDockerfile:
    """Test backend Dockerfile configuration"""

    def test_backend_uses_multi_stage(self):
        """Verify backend uses multi-stage build"""
        with open("backend/Dockerfile", "r") as f:
            content = f.read()

        # Should have multiple FROM statements
        from_count = content.count("FROM")
        assert from_count >= 2

    def test_backend_has_health_check(self):
        """Verify backend has health check"""
        with open("backend/Dockerfile", "r") as f:
            content = f.read()

        assert "HEALTHCHECK" in content

    def test_backend_exposes_port(self):
        """Verify backend exposes port"""
        with open("backend/Dockerfile", "r") as f:
            content = f.read()

        assert "EXPOSE" in content


@_needs_root
class TestFrontendDockerfile:
    """Test frontend Dockerfile configuration"""

    def test_frontend_uses_multi_stage(self):
        """Verify frontend uses multi-stage build"""
        with open("frontend/Dockerfile", "r") as f:
            content = f.read()

        # Should have multiple FROM statements
        from_count = content.count("FROM")
        assert from_count >= 2

    def test_frontend_has_health_check(self):
        """Verify frontend has health check"""
        with open("frontend/Dockerfile", "r") as f:
            content = f.read()

        assert "HEALTHCHECK" in content

    def test_frontend_next_config(self):
        """Verify Next.js has standalone output"""
        config_file = Path("frontend/next.config.ts")
        assert config_file.exists()

        with open(config_file, "r") as f:
            content = f.read()

        # Should have standalone output configuration
        assert "standalone" in content


@_needs_root
class TestSnifferDockerfile:
    """Test sniffer Dockerfile configuration"""

    def test_sniffer_has_health_check(self):
        """Verify sniffer has health check"""
        with open("sniffer/Dockerfile", "r") as f:
            content = f.read()

        assert "HEALTHCHECK" in content


@_needs_root
class TestDockerNetworkIsolation:
    """Test Docker network isolation"""

    def test_services_on_same_network(self):
        """Verify services are on same network"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        # Services should reference same network
        backend_networks = config["services"]["backend"].get("networks", [])
        frontend_networks = config["services"]["frontend"].get("networks", [])

        # Should be able to communicate
        assert len(backend_networks) > 0 or len(frontend_networks) > 0


@_needs_root
class TestSecretHandling:
    """Test secret handling in Docker"""

    def test_no_hardcoded_secrets_in_dockerfile(self):
        """Verify no hardcoded secrets in Dockerfile"""
        for dockerfile_path in ["backend/Dockerfile", "frontend/Dockerfile", "sniffer/Dockerfile"]:
            with open(dockerfile_path, "r") as f:
                content = f.read()

            # Should not have hardcoded sensitive values
            assert "SECRET_KEY=" not in content or "SECRET_KEY=${" in content
            assert "password=" not in content.lower() or "password=${" in content.lower()

    def test_docker_compose_uses_env_vars(self):
        """Verify docker-compose uses environment variables"""
        with open("docker-compose.yml", "r") as f:
            content = f.read()

        # Should use ${VAR} syntax for secrets
        assert "${" in content or "$(" in content


@_needs_root
class TestPortConfiguration:
    """Test port configuration"""

    def test_backend_port_configured(self):
        """Verify backend port is configured"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        backend = config["services"]["backend"]
        ports = backend.get("ports", [])

        # Should expose port
        assert len(ports) > 0

    def test_frontend_port_configured(self):
        """Verify frontend port is configured"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        frontend = config["services"]["frontend"]
        ports = frontend.get("ports", [])

        # Should expose port
        assert len(ports) > 0

    def test_ports_not_conflicting(self):
        """Verify ports don't conflict"""
        import yaml

        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)

        all_ports = []
        for service_name, service_config in config["services"].items():
            ports = service_config.get("ports", [])
            for port_mapping in ports:
                if isinstance(port_mapping, str):
                    host_port = port_mapping.split(":")[0]
                    all_ports.append(host_port)

        # Should not have duplicate host ports
        assert len(all_ports) == len(set(all_ports))
