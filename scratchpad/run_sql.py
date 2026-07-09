#!/usr/bin/env python3
"""Ejecuta SQL contra el proyecto Supabase vía Management API."""
import json
import sys
import urllib.request

PROJECT_REF = "gqslmipjchgbizkbtqqe"
TOKEN = open("/Users/nacho/Documents/proyectos/BMApp/.sb_token").read().strip()


def run(query: str):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    body = json.dumps({"query": query}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.4.0",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


if __name__ == "__main__":
    sql = sys.stdin.read() if len(sys.argv) < 2 else sys.argv[1]
    try:
        print(json.dumps(run(sql), indent=2, ensure_ascii=False))
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode(), file=sys.stderr)
        sys.exit(1)
