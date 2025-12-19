import pandas as pd
import json
from pathlib import Path
import numpy as np

# -----------------------------
# CONFIG
# -----------------------------
INPUT_CSV = "raw_data/season_data.csv"
OUTPUT_DIR = Path("data")
YEAR = 2025

# Teams to generate
TEAMS = [
    "ARI", "ATL", "BAL", "BOS", "CHC", "CHW", "CIN", "CLE", "COL",
    "DET", "HOU", "KCR", "LAA", "LAD", "MIA", "MIL", "MIN", "NYM",
    "NYY", "PHI", "PIT", "SDP", "SFG", "SEA", "STL", "TBR", "TEX",
    "TOR", "WSN", "ATH"
]

# Bucketing thresholds
BATTER_OTHER_PA = 20
DEF_OTHER_INN = 10
PITCH_OTHER_IP = 10
RP_OTHER_IP = 1

# Defensive positions mapping
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
# HELPER FUNCTIONS
# -----------------------------
def weighted_avg(series, weights):
    if weights.sum() == 0:
        return None
    return (series * weights).sum() / weights.sum()

def safe_int(val):
    if pd.isna(val):
        return None
    return int(val)

def safe_float(val, round_digits=None):
    if pd.isna(val):
        return None
    val = float(val)
    if round_digits is not None:
        val = round(val, round_digits)
    return val

# -----------------------------
# LOAD DATA
# -----------------------------
df_full = pd.read_csv(INPUT_CSV)
df_full = df_full.apply(pd.to_numeric, errors="ignore")  # FutureWarning in pandas >=2.0

OUTPUT_DIR.mkdir(exist_ok=True)

# -----------------------------
# LOOP OVER TEAMS
# -----------------------------
for TEAM in TEAMS:
    print(f"Processing {TEAM} {YEAR}...")
    df = df_full[(df_full["Team"] == TEAM) & (df_full["Year"] == YEAR)].copy()

    positions_output = []

    # --------- DEFENSIVE POSITIONS ----------
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
                "usage": safe_float(row[col], 1),
                "percent": safe_float(row[col] / total_inn * 100, 1),
                "PA": safe_int(row["PA"]),
                "wOBA": safe_float(row["wOBA"], 3),
                "xwOBA": safe_float(row["xwOBA"], 3)
            })

        if not minor.empty:
            minor_pa = minor["PA"].sum()
            woba = weighted_avg(minor["wOBA"], minor["PA"])
            xwoba = weighted_avg(minor["xwOBA"], minor["PA"])
            players.append({
                "name": "Other",
                "usage": safe_float(minor[col].sum(), 1),
                "percent": safe_float(minor[col].sum() / total_inn * 100, 1),
                "PA": safe_int(minor_pa),
                "wOBA": safe_float(woba, 3),
                "xwOBA": safe_float(xwoba, 3)
            })

        positions_output.append({
            "position": pos,
            "total_inn": safe_float(total_inn, 1),
            "team_wOBA": safe_float(weighted_avg(pos_players["wOBA"], pos_players["PA"]), 3),
            "players": players
        })

    # --------- BATTING ----------
    batters = df[df["PA"] > 0].copy()
    total_pa = batters["PA"].sum()
    major = batters[batters["PA"] >= BATTER_OTHER_PA]
    minor = batters[batters["PA"] < BATTER_OTHER_PA]

    batting_players = []
    for _, row in major.iterrows():
        batting_players.append({
            "name": row["Name"],
            "PA": safe_int(row["PA"]),
            "percent": safe_float(row["PA"] / total_pa * 100, 1),
            "wOBA": safe_float(row["wOBA"], 3),
            "xwOBA": safe_float(row["xwOBA"], 3)
        })

    if not minor.empty:
        batting_players.append({
            "name": "Other",
            "PA": safe_int(minor["PA"].sum()),
            "percent": safe_float(minor["PA"].sum() / total_pa * 100, 1),
            "wOBA": safe_float(weighted_avg(minor["wOBA"], minor["PA"]), 3),
            "xwOBA": safe_float(weighted_avg(minor["xwOBA"], minor["PA"]), 3)
        })

    batting_output = {"total_PA": safe_int(total_pa), "players": batting_players}

    # --------- DH POSITION ----------
    dh_players_df = df[df["DH_PA"] > 0].copy()
    total_dh_pa = dh_players_df["DH_PA"].sum()
    dh_players = []

    major = dh_players_df[dh_players_df["DH_PA"] >= BATTER_OTHER_PA]
    minor = dh_players_df[dh_players_df["DH_PA"] < BATTER_OTHER_PA]

    for _, row in major.iterrows():
        dh_players.append({
            "name": row["Name"],
            "PA": safe_int(row["DH_PA"]),
            "percent": safe_float(row["DH_PA"] / total_dh_pa * 100, 1),
            "wOBA": safe_float(row["wOBA"], 3),
            "xwOBA": safe_float(row["xwOBA"], 3)
        })

    if not minor.empty:
        dh_players.append({
            "name": "Other",
            "PA": safe_int(minor["DH_PA"].sum()),
            "percent": safe_float(minor["DH_PA"].sum() / total_dh_pa * 100, 1),
            "wOBA": safe_float(weighted_avg(minor["wOBA"], minor["DH_PA"]), 3),
            "xwOBA": safe_float(weighted_avg(minor["xwOBA"], minor["DH_PA"]), 3)
        })

    if dh_players:
        positions_output.append({
            "position": "DH",
            "total_inn": safe_int(total_dh_pa),  # using PA instead of innings
            "team_wOBA": safe_float(weighted_avg(dh_players_df["wOBA"], dh_players_df["DH_PA"]), 3),
            "players": dh_players
        })

    # --------- PITCHING ALL ----------
    pitchers = df[df["IP"] > 0].copy()
    total_ip = pitchers["IP"].sum()
    major = pitchers[pitchers["IP"] >= PITCH_OTHER_IP]
    minor = pitchers[pitchers["IP"] < PITCH_OTHER_IP]

    pitching_all = []
    for _, row in major.iterrows():
        pitching_all.append({
            "name": row["Name"],
            "IP": safe_float(row["IP"], 1),
            "percent": safe_float(row["IP"] / total_ip * 100, 1),
            "ERA": safe_float(row["ERA"], 2),
            "FIP": safe_float(row["FIP"], 2),
            "xFIP": safe_float(row["xFIP"], 2)
        })

    if not minor.empty:
        pitching_all.append({
            "name": "Other",
            "IP": safe_float(minor["IP"].sum(), 1),
            "percent": safe_float(minor["IP"].sum() / total_ip * 100, 1),
            "ERA": safe_float(weighted_avg(minor["ERA"], minor["IP"]), 2),
            "FIP": safe_float(weighted_avg(minor["FIP"], minor["IP"]), 2),
            "xFIP": safe_float(weighted_avg(minor["xFIP"], minor["IP"]), 2)
        })

    # --------- PITCHING RELIEF ----------
    relievers = pitchers[pitchers["P_GS"] == 0].copy()
    rp_total_ip = relievers["IP"].sum()
    major = relievers[relievers["IP"] >= RP_OTHER_IP]
    minor = relievers[relievers["IP"] < RP_OTHER_IP]

    pitching_rp = []
    for _, row in major.iterrows():
        pitching_rp.append({
            "name": row["Name"],
            "IP": safe_float(row["IP"], 1),
            "percent": safe_float(row["IP"] / rp_total_ip * 100, 1),
            "ERA": safe_float(row["ERA"], 2),
            "FIP": safe_float(row["FIP"], 2),
            "xFIP": safe_float(row["xFIP"], 2)
        })

    if not minor.empty:
        pitching_rp.append({
            "name": "Other",
            "IP": safe_float(minor["IP"].sum(), 1),
            "percent": safe_float(minor["IP"].sum() / rp_total_ip * 100, 1),
            "ERA": safe_float(weighted_avg(minor["ERA"], minor["IP"]), 2),
            "FIP": safe_float(weighted_avg(minor["FIP"], minor["IP"]), 2),
            "xFIP": safe_float(weighted_avg(minor["xFIP"], minor["IP"]), 2)
        })

    # --------- FINAL JSON OUTPUT ----------
    output = {
        "team": TEAM,
        "year": YEAR,
        "positions": positions_output,
        "batting": batting_output,
        "pitching": {
            "all": {"total_ip": safe_float(total_ip, 1), "players": pitching_all},
            "relief_only": {"total_ip": safe_float(rp_total_ip, 1), "players": pitching_rp}
        }
    }

    out_path = OUTPUT_DIR / f"{TEAM}_{YEAR}_usage.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {out_path}")

print("All teams processed.")
