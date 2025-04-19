# meetings_fetcher.py
"""Fetch Brazilian Narcóticos Anônimos *virtual* meetings that têm link do Zoom
e grava um arquivo `meetings.json` consumível pelo front‑end.

Fluxo
=====
1. Consulta o servidor BMLT e mantém apenas reuniões virtuais **com URL Zoom**.
2. Se o BMLT falhar ou não retornar nenhuma reunião Zoom, faz screen‑scrape
   na página https://www.na.org.br/virtual/ e procura links Zoom no HTML.
3. Escreve JSON com: ``name``, ``weekday`` (0–6, Sun=0), ``start``, ``end``
   (hora local America/Sao_Paulo) e ``link`` (URL Zoom).

Dependências
------------
``requests`` 2.x e ``beautifulsoup4`` 4.x.  Para Python < 3.9 instalar
``backports.zoneinfo``.
"""
from __future__ import annotations

import json
import re
import sys
import datetime as dt
from pathlib import Path
from typing import List, Dict, Any, Optional

import requests
from bs4 import BeautifulSoup

# ────────────────────────────────────────────── timezone support ──
try:
    from zoneinfo import ZoneInfo  # Python ≥ 3.9
except ImportError:  # pragma: no cover
    from backports.zoneinfo import ZoneInfo  # type: ignore

# ────────────────────────────────────────────── constants ─────────
OUTPUT_FILE = Path(__file__).with_name("meetings.json")
TZ_BR = ZoneInfo("America/Sao_Paulo")

BMLT_ROOTS: list[str] = [
    "https://bmlt.na.org.br/ativo/main_server",
    "https://bmlt.na.org.br/main_server",
]

HEADERS = {"User-Agent": "NA-Meetings-Fetch/3.0 (+github.com/your-handle)"}
TIMEOUT = 20  # seconds
VIRTUAL_RE = re.compile(r"\b(VM|ONL|HY)\b", re.I)
ZOOM_RE = re.compile(r"https?://[^\s\"']*zoom\.us[^\s\"']*", re.I)

# Silence urllib3 *verify=False* noise when we accept self‑signed certs once.
requests.packages.urllib3.disable_warnings(  # type: ignore[attr-defined]
    requests.packages.urllib3.exceptions.InsecureRequestWarning  # type: ignore[attr-defined]
)

# ─────────────────────────────────────────── helpers ──────────────


def minutes_from_hms(hms: str | None) -> int:
    """Convert an *hh:mm:ss* string to total minutes.  Blank → 60."""
    if not hms:
        return 60
    m = re.match(r"(\d{1,2}):(\d{2}):(\d{2})", hms)
    if not m:
        return 60
    hours, minutes, _ = map(int, m.groups())
    return hours * 60 + minutes


def time_plus_minutes(start: dt.time, minutes: int) -> dt.time:
    """Return a new *time* that is *minutes* after *start* (wraps across days)."""
    end_dt = (
        dt.datetime.combine(dt.date.today(), start) + dt.timedelta(minutes=minutes)
    ).time()
    return end_dt.replace(tzinfo=TZ_BR)


def extract_zoom_link(row: Dict[str, Any]) -> str:
    """
    Procura e devolve a primeira URL Zoom encontrada no dict *row*.
    1. Campo `conference_url`
    2. Primeira substring …zoom.us… em qualquer string do dict
    3. "" se não achar
    """
    url = (row.get("conference_url") or "").strip()
    if url:
        return url
    for v in row.values():
        if isinstance(v, str):
            m = ZOOM_RE.search(v)
            if m:
                return m.group(0)
    return ""


# ────────────────────────────────────── BMLT fetcher ─────────────


def fetch_bmlt() -> Optional[List[Dict[str, Any]]]:
    """Return a list of meeting dicts (Zoom only) from the first responsive BMLT root."""
    for root in BMLT_ROOTS:
        url = (
            f"{root}/client_interface/json/"
            "?switcher=GetSearchResults&recursive=1&weekdays=0,1,2,3,4,5,6"
        )
        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, verify=True)
            resp.raise_for_status()
        except requests.exceptions.SSLError as err:
            print(f"TLS verify failed on {root} ({err}); retrying insecure.")
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, verify=False)
        except Exception as err:  # pragma: no cover
            print(f"⚠  BMLT root {root} unreachable: {err}")
            continue

        raw: List[Dict[str, Any]] = resp.json()
        print(f"✓ BMLT root respondeu ({len(raw):,} linhas)")

        meetings: List[Dict[str, Any]] = []
        for row in raw:
            # Mantém apenas reuniões marcadas virtuais/híbridas
            if not VIRTUAL_RE.search(row.get("formats", "")):
                continue
            # e que tenham link Zoom
            link = extract_zoom_link(row)
            if not link:
                continue

            start_hms: str = row["start_time"]  # ex: "19:30:00"
            sh, sm, _ = map(int, start_hms.split(":"))
            start_time = dt.time(sh, sm, tzinfo=TZ_BR)
            duration_min = minutes_from_hms(row.get("duration_time"))

            meetings.append(
                {
                    "name": row.get("meeting_name", "Unnamed"),
                    "weekday": int(row["weekday_tinyint"]),
                    "start": start_time.isoformat(),
                    "end": time_plus_minutes(start_time, duration_min).isoformat(),
                    "link": link,
                }
            )
        if meetings:
            return meetings
    return None


# ────────────────────────────────────── HTML fallback ────────────
WEEKDAY_MAP: dict[str, int] = {
    "domingo": 0,
    "segunda-feira": 1,
    "terça": 2,
    "terça-feira": 2,
    "quarta-feira": 3,
    "quinta-feira": 4,
    "sexta-feira": 5,
    "sábado": 6,
}

TAG_RE = re.compile(r"<[^>]+>")


def untag(txt: str | None) -> str:
    """Strip HTML tags and entities, return plain text."""
    if not txt:
        return ""
    return re.sub(TAG_RE, "", txt)


def scrape_html() -> List[Dict[str, Any]]:
    """Fallback: scrape meetings page and keep only Zoom rows."""
    url = "https://www.na.org.br/virtual/"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, verify=True)
        resp.raise_for_status()
    except Exception as err:  # pragma: no cover
        print(f"⚠  HTML fallback failed: {err}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.select("table tbody tr")
    if not rows:
        print("♻  No <tr> rows found in HTML fallback.")
        return []

    meetings: List[Dict[str, Any]] = []
    for r in rows:
        cells = r.find_all("td")
        if len(cells) < 4:
            continue

        wd_pt = untag(cells[0].get_text()).lower()
        weekday = WEEKDAY_MAP.get(wd_pt)
        if weekday is None:
            continue

        # Encontrar link Zoom
        zoom_a = r.find("a", href=ZOOM_RE)
        link = zoom_a["href"].strip() if zoom_a else ""
        if not link:
            continue  # pula se não houver Zoom

        start_txt = untag(cells[1].get_text())[:5] or "00:00"
        end_txt = untag(cells[2].get_text())[:5] or "00:00"
        name = untag(cells[3].get_text(" ", strip=True)) or "Unnamed"

        sh, sm = map(int, start_txt.split(":"))
        eh, em = map(int, end_txt.split(":"))
        start_t = dt.time(sh, sm, tzinfo=TZ_BR)
        end_t = dt.time(eh, em, tzinfo=TZ_BR)

        meetings.append(
            {
                "name": name,
                "weekday": weekday,
                "start": start_t.isoformat(),
                "end": end_t.isoformat(),
                "link": link,
            }
        )

    print(f"✓ HTML fallback produziu {len(meetings):,} reuniões Zoom")
    return meetings


# ────────────────────────────────────────── entry‑point ──────────
def main() -> None:
    meetings = fetch_bmlt() or scrape_html()
    if not meetings:
        sys.exit("⚠  No Zoom meetings extracted. Check network or site layout.")

    OUTPUT_FILE.write_text(json.dumps(meetings, ensure_ascii=False, indent=2))
    print(f"✅ Wrote {len(meetings):,} meetings → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
