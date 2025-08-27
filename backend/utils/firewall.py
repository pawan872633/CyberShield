import platform
import re
import subprocess
from typing import Tuple

RULE_PREFIX = "CyberShield Block"

# -------------------- low-level utils -------------------- #
def _run(cmd: str) -> Tuple[bool, str]:
    """Run shell command, return (ok, output)."""
    try:
        p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        out = (p.stdout or "") + (p.stderr or "")
        # netsh returns 0 on success; sometimes still prints messages
        ok = p.returncode == 0
        # Detect common elevation error
        if "requires elevation" in out.lower() or "access is denied" in out.lower():
            return False, "Admin rights required (run terminal as Administrator)."
        return ok, out.strip()
    except Exception as e:
        return False, f"Exception: {e}"

def _is_windows() -> bool:
    return platform.system().lower().startswith("win")

# -------------------- IP helpers -------------------- #
_ipv4 = re.compile(r"^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$")
_ipv6 = re.compile(r"^[0-9a-fA-F:]+$")  # basic check; netsh will validate fully

def _strip_port(s: str) -> str:
    """Remove :port if present (e.g., '8.8.8.8:443' -> '8.8.8.8')."""
    if not s:
        return s
    # [IPv6]:port
    if s.startswith("[") and "]" in s:
        host = s[1:s.index("]")]
        return host
    # IPv4:port
    if ":" in s and s.count(":") == 1 and _ipv4.match(s.split(":")[0]):
        return s.split(":")[0]
    return s

def _normalize_ip(ip: str) -> str:
    """Trim, strip port; keep CIDR if provided."""
    ip = (ip or "").strip()
    if "/" in ip:  # already CIDR/range -> leave for netsh
        return _strip_port(ip.split("/")[0]) + "/" + ip.split("/")[1]
    return _strip_port(ip)

def _remoteip_arg(ip: str) -> str:
    """
    Build a netsh-compatible RemoteIP value.
    - Single IPv4 -> '<ip>/32'
    - Single IPv6 -> '<ip>/128'
    - CIDR or range -> as-is
    """
    if "/" in ip or "-" in ip or "," in ip:
        return ip  # pass-through (CIDR/range/list)
    if _ipv4.match(ip):
        return f"{ip}/32"
    if _ipv6.match(ip):
        return f"{ip}/128"
    # Let netsh validate domain/invalid inputs
    return ip

def _rule_names(ip: str) -> Tuple[str, str]:
    return f"{RULE_PREFIX} {ip} (in)", f"{RULE_PREFIX} {ip} (out)"

# -------------------- public API -------------------- #
def block_ip(ip: str) -> Tuple[bool, str]:
    """
    Create inbound + outbound BLOCK rules for the IP/CIDR.
    Idempotent: existing same-named rules are deleted first.
    Returns (ok, message).
    """
    if not _is_windows():
        return False, "AUTO_BLOCK supported only on Windows in this build."

    ip = _normalize_ip(ip)
    remoteip = _remoteip_arg(ip)
    name_in, name_out = _rule_names(ip)

    # Delete existing (idempotent)
    _run(f'netsh advfirewall firewall delete rule name="{name_in}"')
    _run(f'netsh advfirewall firewall delete rule name="{name_out}"')

    # Add inbound
    cmd_in = (
        f'netsh advfirewall firewall add rule '
        f'name="{name_in}" dir=in action=block profile=any enable=yes remoteip={remoteip}'
    )
    ok_in, out_in = _run(cmd_in)

    # Add outbound
    cmd_out = (
        f'netsh advfirewall firewall add rule '
        f'name="{name_out}" dir=out action=block profile=any enable=yes remoteip={remoteip}'
    )
    ok_out, out_out = _run(cmd_out)

    ok = ok_in and ok_out
    msg = f'IN: {out_in or "Ok."} | OUT: {out_out or "Ok."}'
    return ok, msg

def unblock_ip(ip: str) -> Tuple[bool, str]:
    """
    Remove both IN/OUT rules for the given IP/CIDR.
    Returns (ok, message). ok=True if at least one rule was removed.
    """
    if not _is_windows():
        return False, "AUTO_BLOCK supported only on Windows in this build."

    ip = _normalize_ip(ip)
    name_in, name_out = _rule_names(ip)

    ok1, out1 = _run(f'netsh advfirewall firewall delete rule name="{name_in}"')
    ok2, out2 = _run(f'netsh advfirewall firewall delete rule name="{name_out}"')

    ok = ok1 or ok2
    msg = f'IN: {out1 or "none"} | OUT: {out2 or "none"}'
    return ok, msg

def status_ip(ip: str) -> Tuple[bool, str]:
    """
    Check if rules exist for the IP. Returns (exists, details).
    """
    if not _is_windows():
        return False, "Not Windows."
    ip = _normalize_ip(ip)
    name_in, name_out = _rule_names(ip)

    ok1, out1 = _run(f'netsh advfirewall firewall show rule name="{name_in}"')
    ok2, out2 = _run(f'netsh advfirewall firewall show rule name="{name_out}"')
    exists = ("No rules match" not in out1) or ("No rules match" not in out2)
    return exists, f'IN: {out1 or "none"} | OUT: {out2 or "none"}'
