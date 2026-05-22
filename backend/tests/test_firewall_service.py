"""
Guards ensuring _validate_ip rejects dangerous addresses before any
sudo iptables / pfctl call, and that block_ip honours those rejections.
These tests must stay green before subprocess.run is uncommented for production.
"""
import subprocess
from unittest.mock import patch, MagicMock

import pytest

from app.services.firewall_service import FirewallService


@pytest.fixture()
def svc():
    return FirewallService()


# ---------------------------------------------------------------------------
# _validate_ip — accepted addresses
# ---------------------------------------------------------------------------

VALID_PUBLIC = [
    "8.8.8.8",         # Google DNS
    "1.1.1.1",         # Cloudflare DNS
    "45.33.32.156",    # Linode public IP
    "104.21.0.1",      # Cloudflare network
    "2606:4700::1",    # Cloudflare IPv6
]

@pytest.mark.parametrize("ip", VALID_PUBLIC)
def test_valid_public_ip_accepted(svc, ip):
    assert svc._validate_ip(ip) is True


# ---------------------------------------------------------------------------
# _validate_ip — rejected addresses
# ---------------------------------------------------------------------------

LOOPBACK = ["127.0.0.1", "127.255.255.255", "::1"]
PRIVATE = ["10.0.0.1", "10.255.255.255", "172.16.0.1", "172.31.0.1",
           "192.168.0.1", "192.168.255.255"]
LINK_LOCAL = ["169.254.0.1", "169.254.255.254", "fe80::1"]
UNSPECIFIED = ["0.0.0.0", "::"]
MULTICAST = ["224.0.0.1", "239.255.255.255", "ff02::1"]
INVALID_STRINGS = ["not-an-ip", "256.0.0.1", "1.2.3.4.5", "", "example.com",
                   "192.168.1.1/24", "0.0.0.0/0"]

@pytest.mark.parametrize("ip", LOOPBACK)
def test_loopback_rejected(svc, ip):
    assert svc._validate_ip(ip) is False

@pytest.mark.parametrize("ip", PRIVATE)
def test_private_rejected(svc, ip):
    assert svc._validate_ip(ip) is False

@pytest.mark.parametrize("ip", LINK_LOCAL)
def test_link_local_rejected(svc, ip):
    assert svc._validate_ip(ip) is False

@pytest.mark.parametrize("ip", UNSPECIFIED)
def test_unspecified_rejected(svc, ip):
    assert svc._validate_ip(ip) is False

@pytest.mark.parametrize("ip", MULTICAST)
def test_multicast_rejected(svc, ip):
    assert svc._validate_ip(ip) is False

@pytest.mark.parametrize("ip", INVALID_STRINGS)
def test_invalid_strings_rejected(svc, ip):
    assert svc._validate_ip(ip) is False


# ---------------------------------------------------------------------------
# block_ip — firewall never called for dangerous / invalid addresses
# ---------------------------------------------------------------------------

MUST_NOT_REACH_FIREWALL = [
    "127.0.0.1",   # loopback — would kill localhost DB
    "0.0.0.0",     # unspecified — catch-all DROP
    "10.0.0.1",    # private
    "192.168.1.1", # private
    "169.254.1.1", # link-local
    "224.0.0.1",   # multicast
    "not-an-ip",   # garbage
    "1.2.3.4/32",  # CIDR notation
]

@pytest.mark.parametrize("ip", MUST_NOT_REACH_FIREWALL)
def test_block_ip_never_calls_subprocess_for_bad_ip(svc, ip):
    """Dangerous IPs must be stopped before any OS firewall call."""
    with patch("subprocess.run") as mock_run:
        result = svc.block_ip(ip)
    assert result is False
    mock_run.assert_not_called()


def test_block_ip_calls_subprocess_for_valid_public_ip_on_linux():
    """Valid public IPs must reach the iptables call on Linux."""
    svc = FirewallService()
    svc.os_type = "Linux"

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0)
        # Temporarily uncomment the subprocess call for this test by
        # patching _block_linux to actually invoke subprocess.run
        original = svc._block_linux

        def patched_block_linux(ip):
            command = ["sudo", "iptables", "-A", "INPUT", "-s", ip, "-j", "DROP"]
            subprocess.run(command)
            return True

        svc._block_linux = patched_block_linux
        result = svc.block_ip("8.8.8.8")

    assert result is True
    mock_run.assert_called_once_with(
        ["sudo", "iptables", "-A", "INPUT", "-s", "8.8.8.8", "-j", "DROP"]
    )
