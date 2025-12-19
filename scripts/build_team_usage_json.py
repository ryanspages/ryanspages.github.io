import pandas as pd
import json
from pathlib import Path

# -----------------------------
# CONFIG
# -----------------------------
INPUT_CSV = "raw_data/season_data.csv"
OUTPUT_DIR = Path("data")
YEAR = 2025

# List the teams you want to generate files for
TEAMS = [
    "ARI", "ATL", "BAL", "BOS", "CHC", "CHW", "CIN", "CLE", "COL",
    "DET", "HOU", "KCR", "LAA", "LAD", "MIA", "MIL", "MIN", "NYM",
    "NYY", "PHI", "PIT", "SDP", "SFG", "SEA", "STL", "TBR", "TEX",
    "TOR", "WSH", "ATH"
]

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
# HELPER FUNCTIONS
# -----------------------------
def weighted_avg(series, weights):
    if weights.sum() == 0:
        return None
    return (series * weights).sum() / weights.sum()


# -----------------------------
# LOAD FULL DATA
# -----------------------------
df_full = pd.read_csv(INPUT_CSV)

# Ensure numeric columns are numeric
df_full = df_full.apply(pd.to_numeric, errors="ignore")

OUTPUT_DIR.mkdir(exist_ok=True)

# -----------------------------
# LOOP OVER TEAMS
# -----------------------------
for TEAM in TEAMS:
    print(f"Processing {TEAM} {YEAR}...")

    df = df_full[(df_full["Team"] == TEAM) & (df_full["Year"] == YEAR)].copy()

    # Defensive positions
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
            minor_pa = minor["PA"].sum()
            woba = weighted_avg(minor["wOBA"], minor["PA"])
            xwoba = weighted_avg(minor["xwOBA"], minor["PA"])
            players.append({
                "name": "Other",
                "usage": round(minor[col].sum(), 1),
                "percent": round(minor[col].sum() / total_inn * 100, 1) if total_inn > 0 else 0,
                "PA": int(minor_pa),
                "wOBA": None if woba is None else round(woba, 3),
                "xwOBA": None if xwoba is None else round(xwoba, 3)
            })

        positions_output.append({
            "position": pos,
            "total_inn": round(total_inn, 1),
            "team_wOBA": round(weighted_avg(pos_players["wOBA"], pos_players["PA"]), 3),
            "players": players
        })

    # Batting
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
            "wOBA": None if weighted_avg(minor["wOBA"], minor["PA"]) is None else round(weighted_avg(minor["wOBA"], minor["PA"]), 3),
            "xwOBA": None if weighted_avg(minor["xwOBA"], minor["PA"]) is None else round(weighted_avg(minor["xwOBA"], minor["PA"]), 3)
        })

    batting_output = {"total_PA": int(total_pa), "players": batting_players}

    # Pitching — all IP
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
            "ERA": None if weighted_avg(minor["ERA"], minor["IP"]) is None else round(weighted_avg(minor["ERA"], minor["IP"]), 2),
            "FIP": None if weighted_avg(minor["FIP"], minor["IP"]) is None else round(weighted_avg(minor["FIP"], minor["IP"]), 2),
            "xFIP": None if weighted_avg(minor["xFIP"], minor["IP"]) is None else round(weighted_avg(minor["xFIP"], minor["IP"]), 2)
        })
    # -----------------------------
    # DH POSITION (based on PA)
    # -----------------------------
    dh_players_df = batters.copy()  # or filter by team if needed
    total_dh_pa = dh_players_df["PA"].sum()

    dh_players = []

    major = dh_players_df[dh_players_df["PA"] >= BATTER_OTHER_PA]
    minor = dh_players_df[dh_players_df["PA"] < BATTER_OTHER_PA]

    for _, row in major.iterrows():
      dh_players.append({
        "name": row["Name"],
        "PA": int(row["PA"]),
        "percent": round(row["PA"] / total_dh_pa * 100, 1),
        "wOBA": row["wOBA"],
        "xwOBA": row["xwOBA"]
      })

    if not minor.empty:
      dh_players.append({
        "name": "Other",
        "PA": int(minor["PA"].sum()),
        "percent": round(minor["PA"].sum() / total_dh_pa * 100, 1),
        "wOBA": round(weighted_avg(minor["wOBA"], minor["PA"]), 3),
        "xwOBA": round(weighted_avg(minor["xwOBA"], minor["PA"]), 3)
    })

    dh_output = {
      "position": "DH",
      "total_PA": int(total_dh_pa),
      "players": dh_players
    }
    
    # ---------- DH POSITION ----------
# Assume you already prepared dh_players (list of dicts) and total_dh_pa
if dh_players:  # only append if there are any DH entries
    positions_output.append({
        "position": "DH",
        "total_inn": total_dh_pa,  # we’re using PA here instead of innings
        "team_wOBA": round(weighted_avg(dh_players_df["wOBA"], dh_players_df["PA"]), 3),
        "players": dh_players
    })

    # Pitching — relief only
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
            "ERA": None if weighted_avg(minor["ERA"], minor["IP"]) is None else round(weighted_avg(minor["ERA"], minor["IP"]), 2),
            "FIP": None if weighted_avg(minor["FIP"], minor["IP"]) is None else round(weighted_avg(minor["FIP"], minor["IP"]), 2),
            "xFIP": None if weighted_avg(minor["xFIP"], minor["IP"]) is None else round(weighted_avg(minor["xFIP"], minor["IP"]), 2)
        })

    # Final JSON output
    output = {
        "team": TEAM,
        "year": YEAR,
        "positions": positions_output,
        "batting": batting_output,
        "pitching": {
            "all": {"total_ip": round(total_ip, 1), "players": pitching_all},
            "relief_only": {"total_ip": round(rp_total_ip, 1), "players": pitching_rp}
        }
    }

    out_path = OUTPUT_DIR / f"{TEAM}_{YEAR}_usage.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {out_path}")

print("All teams processed.")
