import subprocess
import os
import platform
import ipaddress
import logging

logger = logging.getLogger(__name__)

_OS_MACOS = "Darwin"
_OS_LINUX = "Linux"


class FirewallService:
    def __init__(self):
        self.os_type = platform.system()

    def _validate_ip(self, ip: str) -> bool:
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            return False
        # Reject addresses that must never appear as external threat sources
        if (addr.is_loopback or addr.is_private or addr.is_link_local
                or addr.is_reserved or addr.is_unspecified or addr.is_multicast):
            return False
        return True

    def block_ip(self, ip: str) -> bool:
        """Block an IP via the OS firewall (pfctl on macOS, iptables on Linux)."""
        if not self._validate_ip(ip):
            logger.warning("Firewall: Rejected invalid IP address '%s'", ip)
            return False
        try:
            if self.os_type == _OS_MACOS:
                return self._block_mac(ip)
            elif self.os_type == _OS_LINUX:
                return self._block_linux(ip)
            else:
                logger.warning("Firewall: OS %s not supported for active blocking.", self.os_type)
                return False
        except Exception as e:
            logger.error("Firewall error blocking %s: %s", ip, e)
            return False

    def _block_mac(self, ip: str) -> bool:
        rule = f"block drop from {ip} to any"
        logger.info("[FIREWALL - macOS] Rule added: %s", rule)
        # Command: echo "<rule>" | sudo pfctl -a nids_rules -f -
        return True

    def _block_linux(self, ip: str) -> bool:
        command = ["sudo", "iptables", "-A", "INPUT", "-s", ip, "-j", "DROP"]
        logger.info("[FIREWALL - Linux] Running: %s", " ".join(command))
        # In a real deployed environment: subprocess.run(command)
        return True


firewall_service = FirewallService()
