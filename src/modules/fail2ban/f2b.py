#!/usr/bin/env python3
"""Passerelle vers le socket de commande de fail2ban.

fail2ban ne parle pas HTTP : son serveur écoute sur un socket UNIX et
échange des objets Python sérialisés (pickle), terminés par un sentinelle.
C'est illisible depuis Node, d'où ce petit relais qui traduit en JSON.

Sort TOUJOURS avec le code 0, même en erreur : le message part dans le
JSON. Un code non nul ferait perdre la sortie à l'appelant, qui n'aurait
plus qu'un échec sans explication.
"""
import json
import os
import pickle
import socket
import sys

END = b"<F2B_END_COMMAND>"
SOCKET_PATH = os.environ.get("FAIL2BAN_SOCKET", "/var/run/fail2ban/fail2ban.sock")


def send(command):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.settimeout(10)
    try:
        s.connect(SOCKET_PATH)
        s.sendall(pickle.dumps(command, 2) + END)
        buf = b""
        while END not in buf:
            chunk = s.recv(8192)
            if not chunk:
                break
            buf += chunk
        return pickle.loads(buf[: buf.find(END)])
    finally:
        s.close()


def as_dict(pairs):
    """fail2ban répond en listes de couples imbriquées, pas en dictionnaires."""
    out = {}
    for key, value in pairs:
        out[key] = dict(value) if isinstance(value, list) and value and isinstance(value[0], tuple) else value
    return out


def jail_names():
    code, payload = send(["status"])
    if code != 0:
        raise RuntimeError(str(payload))
    raw = as_dict(payload).get("Jail list", "")
    return [j.strip() for j in raw.split(",") if j.strip()]


def jail_detail(name):
    code, payload = send(["status", name])
    if code != 0:
        raise RuntimeError(str(payload))
    data = as_dict(payload)
    flt = data.get("Filter", {})
    act = data.get("Actions", {})
    return {
        "name": name,
        "currentlyFailed": flt.get("Currently failed", 0),
        "totalFailed": flt.get("Total failed", 0),
        "currentlyBanned": act.get("Currently banned", 0),
        "totalBanned": act.get("Total banned", 0),
        "bannedIps": list(act.get("Banned IP list", []) or []),
        "watching": flt.get("File list", flt.get("Journal matches", [])),
    }


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "overview"
    try:
        if action == "overview":
            jails = [jail_detail(n) for n in jail_names()]
            version = send(["version"])[1]
            print(json.dumps({"ok": True, "version": version, "jails": jails}))

        elif action == "jail":
            print(json.dumps({"ok": True, "jail": jail_detail(sys.argv[2])}))

        elif action in ("ban", "unban"):
            jail, ip = sys.argv[2], sys.argv[3]
            verb = "banip" if action == "ban" else "unbanip"
            code, payload = send(["set", jail, verb, ip])
            if code != 0:
                raise RuntimeError(str(payload))
            print(json.dumps({"ok": True, "result": str(payload)}))

        else:
            raise ValueError(f"action inconnue : {action}")

    except FileNotFoundError:
        print(json.dumps({"ok": False, "error": f"Socket fail2ban introuvable ({SOCKET_PATH})."}))
    except PermissionError:
        print(json.dumps({"ok": False, "error": "Accès au socket fail2ban refusé."}))
    except Exception as exc:  # noqa: BLE001 — tout remonte en JSON à l'appelant
        print(json.dumps({"ok": False, "error": str(exc)}))


if __name__ == "__main__":
    main()
