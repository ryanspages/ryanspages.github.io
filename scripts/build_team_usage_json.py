import pandas as pd
import json
from pathlib import Path

# -----------------------------
# CONFIG
# -----------------------------
INPUT_CSV = "raw_data/season_data.csv"
OUTPUT_DIR = Path("data")
TEAM = "CHC"
YEAR = 2025

# Bucketing thresholds
BATTER_OTHER_PA = 20
DEF_OTHER_INN = 10
PITCH_OTHER_IP = 10
RP_OTHER_IP = 1

# Defensive position mapping
DEF_POSITIONS = {
    "C": "C_Inn",
    "1B": "FirstB_Inn",
    "2B": "SecB_Inn",
    "3B": "ThirdB_Inn",
    "SS": "SS_Inn",
    "LF": "LF_Inn",
    "CF": "CF_Inn",
    "RF": "RF_Inn"
}

# -----------------------------
# LOAD & FILTER DATA
# -----------------------------
df = pd.read_csv(INPUT_CSV)

df = df[(df["Team"] == TEAM) & (df["Year"] == YEAR)].copy()

# Ensure numeric columns are numeric
df = df.apply(pd.to_numeric, errors="ignore")

# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
def weighted_avg(series, weights):
    if weights.sum() == 0:
        return None
    return (series * weights).sum() / weights.sum()

# -----------------------------
# DEFENSIVE POSITIONS
# -----------------------------
positions_output = []

for pos, col in DEF_POSITIONS.items():
    total_inn = df[col].sum()

    if total_inn == 0:
        continue

    pos_players = df[df[col] > 0].copy()

    major = pos_players[pos_players[col] >= DEF_OTHER_INN]
    minor = pos_players[pos_players[col] < DEF_OTHER_INN]

    players = []

    for _, row in major.iterrows():
        players.append({
            "name": row["Name"],
            "usage": round(row[col], 1),
            "percent": round(row[col] / total_inn * 100, 1),
            "PA": int(row["PA"]),
            "wOBA": row["wOBA"],
            "xwOBA": row["xwOBA"]
        })

    if not minor.empty:
        players.append({
            "name": "Other",
            "usage": round(minor[col].sum(), 1),
            "percent": round(minor[col].sum() / total_inn * 100, 1),
            "PA": int(minor["PA"].sum()),
            "wOBA": round(weighted_avg(minor["wOBA"], minor["PA"]), 3),
            "xwOBA": round(weighted_avg(minor["xwOBA"], minor["PA"]), 3)
        })

    positions_output.append({
        "position": pos,
        "total_inn": round(total_inn, 1),
        "team_wOBA": round(weighted_avg(pos_players["wOBA"], pos_players["PA"]), 3),
        "players": players
    })

# -----------------------------
# BATTING (PA BAR)
# -----------------------------
batters = df[df["PA"] > 0].copy()
total_pa = batters["PA"].sum()

major = batters[batters["PA"] >= BATTER_OTHER_PA]
minor = batters[batters["PA"] < BATTER_OTHER_PA]

batting_players = []

for _, row in major.iterrows():
    batting_players.append({
        "name": row["Name"],
        "PA": int(row["PA"]),
        "percent": round(row["PA"] / total_pa * 100, 1),
        "wOBA": row["wOBA"],
        "xwOBA": row["xwOBA"]
    })

if not minor.empty:
    batting_players.append({
        "name": "Other",
        "PA": int(minor["PA"].sum()),
        "percent": round(minor["PA"].sum() / total_pa * 100, 1),
        "wOBA": round(weighted_avg(minor["wOBA"], minor["PA"]), 3),
        "xwOBA": round(weighted_avg(minor["xwOBA"], minor["PA"]), 3)
    })

batting_output = {
    "total_PA": int(total_pa),
    "players": batting_players
}

# -----------------------------
# PITCHING — ALL IP
# -----------------------------
pitchers = df[df["IP"] > 0].copy()
total_ip = pitchers["IP"].sum()

major = pitchers[pitchers["IP"] >= PITCH_OTHER_IP]
minor = pitchers[pitchers["IP"] < PITCH_OTHER_IP]

pitching_all = []

for _, row in major.iterrows():
    pitching_all.append({
        "name": row["Name"],
        "IP": round(row["IP"], 1),
        "percent": round(row["IP"] / total_ip * 100, 1),
        "ERA": row["ERA"],
        "FIP": row["FIP"],
        "xFIP": row["xFIP"]
    })

if not minor.empty:
    pitching_all.append({
        "name": "Other",
        "IP": round(minor["IP"].sum(), 1),
        "percent": round(minor["IP"].sum() / total_ip * 100, 1),
        "ERA": round(weighted_avg(minor["ERA"], minor["IP"]), 2),
        "FIP": round(weighted_avg(minor["FIP"], minor["IP"]), 2),
        "xFIP": round(weighted_avg(minor["xFIP"], minor["IP"]), 2)
    })

# -----------------------------
# PITCHING — RELIEF ONLY (P_GS = 0)
# -----------------------------
relievers = pitchers[pitchers["P_GS"] == 0].copy()
rp_total_ip = relievers["IP"].sum()

major = relievers[relievers["IP"] >= RP_OTHER_IP]
minor = relievers[relievers["IP"] < RP_OTHER_IP]

pitching_rp = []

for _, row in major.iterrows():
    pitching_rp.append({
        "name": row["Name"],
        "IP": round(row["IP"], 1),
        "percent": round(row["IP"] / rp_total_ip * 100, 1),
        "ERA": row["ERA"],
        "FIP": row["FIP"],
        "xFIP": row["xFIP"]
    })

if not minor.empty:
    pitching_rp.append({
        "name": "Other",
        "IP": round(minor["IP"].sum(), 1),
        "percent": round(minor["IP"].sum() / rp_total_ip * 100, 1),
        "ERA": round(weighted_avg(minor["ERA"], minor["IP"]), 2),
        "FIP": round(weighted_avg(minor["FIP"], minor["IP"]), 2),
        "xFIP": round(weighted_avg(minor["xFIP"], minor["IP"]), 2)
    })

# -----------------------------
# FINAL JSON OUTPUT
# -----------------------------
output = {
    "team": TEAM,
    "year": YEAR,
    "positions": positions_output,
    "batting": batting_output,
    "pitching": {
        "all": {
            "total_ip": round(total_ip, 1),
            "players": pitching_all
        },
        "relief_only": {
            "total_ip": round(rp_total_ip, 1),
            "players": pitching_rp
        }
    }
}

OUTPUT_DIR.mkdir(exist_ok=True)

out_path = OUTPUT_DIR / f"{TEAM}_{YEAR}_usage.json"
with open(out_path, "w") as f:
    json.dump(output, f, indent=2)

print(f"Wrote {out_path}")
