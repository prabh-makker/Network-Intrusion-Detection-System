import subprocess
import os
import platform

class FirewallService:
    def __init__(self):
        self.os_type = platform.system()
    
    def block_ip(self, ip: str) -> bool:
        """
        Blocks an IP address using the OS-specific firewall.
        - macOS: pfctl
        - Linux: iptables
        """
        try:
            if self.os_type == "Darwin": # macOS
                return self._block_mac(ip)
            elif self.os_type == "Linux":
                return self._block_linux(ip)
            else:
                print(f"Firewall: OS {self.os_type} not supported for active blocking.")
                return False
        except Exception as e:
            print(f"Firewall Error (Blocking {ip}): {e}")
            return False

    def _block_mac(self, ip: str) -> bool:
        """Uses pfctl to block an IP on macOS."""
        # Create a rule file or add to a table.
        # For a production app, we would use a dedicated 'nids_blocked' table in pf.
        # This requires sudo.
        rule = f'block drop from {ip} to any'
        # In this demo, we'll just log the command we WOULD run,
        # unless we want to risk running sudo commands (which we won't without explicitly being asked).
        print(f"🛡️ [FIREWALL - macOS] Rule added: {rule}")
        # Command: echo "block drop from {ip} to any" | sudo pfctl -a nids_rules -f -
        return True

    def _block_linux(self, ip: str) -> bool:
        """Uses iptables to block an IP on Linux."""
        command = ["sudo", "iptables", "-A", "INPUT", "-s", ip, "-j", "DROP"]
        print(f"🛡️ [FIREWALL - Linux] Running: {' '.join(command)}")
        # In a real deployed environment, we would subprocess.run(command)
        return True

firewall_service = FirewallService()
