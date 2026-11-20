# Gemini prompt pack — CricEngine historical scoresheets

These prompts make Gemini write the ball-by-ball records for **3 one-off matches** and the **Hall 12 Phatta League** (8 teams, 2 groups of 4, semis A1 v B2 / B1 v A2, final). Gemini only writes *what happened on each ball*; CricEngine derives strike rotation, over numbers, timestamps and wagon-wheel coordinates itself and rejects anything that breaks the rules.

**Workflow (one Gemini chat, 6 messages):**

| # | Paste into Gemini | Save Gemini's JSON to | Then run |
|---|---|---|---|
| 0 | MASTER CONTEXT (below) | — | — |
| 1 | STEP 1 – one-offs | `src/data/seed/scoresheets/one-off-matches.json` | `npm run seed:check` |
| 2 | STEP 2 – Group A | `src/data/seed/scoresheets/h12pl-group-a.json` | `npm run seed:check` |
| 3 | STEP 3 – Group B | `src/data/seed/scoresheets/h12pl-group-b.json` | `npm run seed:check` |
| 4 | STEP 4 – semi-finals (+ paste the points table printed by seed:check) | `src/data/seed/scoresheets/h12pl-knockouts.json` | `npm run seed:check` |
| 5 | STEP 5 – final (+ paste the SF results printed by seed:check) | append to `h12pl-knockouts.json` | `npm run seed:check` → `npm test` |
| ↺ | FIX prompt with the `ERROR` lines, whenever seed:check fails | replace the affected objects | repeat until `✔ no errors` |

Use Gemini 2.5 Pro / 3 Pro, temperature ≤ 0.7. Ask for one step at a time — long outputs are where LLMs lose count of balls.

---

## 0 · MASTER CONTEXT (paste first, once)

```text
You are a meticulous cricket scorer for IIT Kanpur's Hall 12. I am loading historical match records into my cricket scoring app, CricEngine. You will write compact ball-by-ball SCORESHEETS in JSON. My app validates every ball against the Laws of Cricket and rejects the whole match on any mistake, so accuracy beats creativity.

CONTEXT — what these matches are
- Tennis-ball hall cricket on the Hall 12 ground / courtyard at IIT Kanpur, played by B.Tech students.
- Hall 12 Phatta League 2026: 8 teams of exactly 7 players, 10 overs a side, max 2 overs per bowler, 2 groups of 4 (round robin), top 2 of each group cross over into semi-finals (A1 v B2, B1 v A2), then a final.
- Three one-off box-cricket games: 4–6 overs a side, 4–5 players a side, max 2 overs per bowler, anyone may bowl.
- A side is ALL OUT when (players − 1) wickets fall: 6 wickets with 7 players, 4 with 5, 3 with 4.

BALL GRAMMAR — one token per delivery, tokens separated by single spaces, one string per over
  .            dot ball
  1 2 3 4 6    runs off the bat (never 5)
  wd           wide (1 run). wd+1 … wd+4 = wide plus extra runs (wd+4 = wide to the boundary, 5 wides)
  nb           no-ball, nothing off the bat. nb+1 … nb+6 = no-ball plus runs off the bat (never nb+5)
  b1 … b4      byes          lb1 … lb4   leg byes
  W:b          bowled
  W:c:P12      caught by P12  (use the bowler's own key for caught-and-bowled)
  W:st:P12     stumped by the wicket-keeper P12 (only off a spinner, never off a no-ball)
  W:hw         hit wicket
  W:ro:P12     striker run out by P12, no run completed
  W:ro:P12:1   striker run out attempting the 2nd run, 1 run completed (0–3 allowed)
  W:ro:P12:ns  NON-striker run out (add :1 etc. before :ns if runs were completed: W:ro:P12:1:ns)
  wd+W:st:P12  stumped off a wide        nb+W:ro:P12  run out off a no-ball
  Optional: add @ZONE to any scoring shot to set the wagon wheel, e.g. 4@COVER, 6@LONG_ON.
  Zones: FINE_LEG SQUARE_LEG MID_WICKET LONG_ON LONG_OFF COVER POINT THIRD_MAN
  Do NOT use W:lbw — LBW is not given in Hall 12 tennis-ball cricket.

HARD RULES — every one is machine-checked
 1. Every over has EXACTLY 6 legal balls. wd and nb do NOT count and are re-bowled, so an over with one wide has 7 tokens.
 2. The only over allowed to have fewer than 6 legal balls is the LAST over of an innings that ended because the side was all out or the target was reached.
 3. 1st innings: keep bowling until all overs are bowled OR the side is all out. Never stop early.
 4. 2nd innings: target = 1st-innings total + 1. Keep a running total and STOP on the exact ball the target is reached (write nothing after it). If the target is not reached, continue to all overs or all out.
 5. Do not let the winning run and the last wicket happen on the same ball.
 6. No bowler bowls two overs in a row. No bowler bowls more than 2 overs. With 7 players and 10 overs, at least 5 different bowlers bowl in each innings.
 7. The wicket-keeper never bowls (tournament only). Stumpings are always by that side's keeper.
 8. Bowlers and fielders come from the FIELDING side only. In the league, bowlers must be players listed with a bowling style (in one-offs anyone may bowl).
 9. battingOrder lists EVERY player of the batting side exactly once (7 in the league, 4–5 in one-offs). Openers are the first two. Players who don't get to bat still appear at the end.
10. After a no-ball the next legal ball is a FREE HIT: the only dismissal allowed on it is a run out.
11. Knockout matches must not end in a tie.
12. Toss: "winner" is the team key (league, e.g. "PPK") or "A"/"B" (one-offs). "decision" is "BAT" or "BOWL". The side that bats first follows from this — make innings[0].battingOrder that side.
13. Runs off the bat count for strike rotation exactly as on the field; you don't need to track who is on strike — CricEngine does it — but do keep the running team total so the chase stops on time.

REALISM (10-over tennis-ball games, 7-a-side)
- Typical totals 70–115; a big one ~130; a collapse ~45. One-offs: about 7–11 runs per over.
- Per 10 overs, roughly: 30–35% dots, ~30% singles, ~10% twos, 1–3 threes, 8–14 fours, 3–8 sixes, 3–8 wides, 0–2 no-balls, 4–6 wickets.
- Dismissal mix: ~50% caught, ~30% bowled, ~15% run out, the occasional stumping off a spinner, rare hit wicket.
- Openers and the captain usually score most; a 40+ score is rare and memorable; 3-wicket hauls happen, 4-fors are rare.
- Vary batting orders a little across matches (form, pinch-hitters), keep keepers and captains in sensible positions.
- Mix the results: a few chases, a few defended totals, one last-over finish per group, one one-sided game.

OUTPUT FORMAT — for every step
- Reply with ONE json code block containing a JSON ARRAY of scoresheet objects and nothing else inside the block. No comments, no trailing commas.
- After the block, add a short plain-text recap per match: first-innings total, chase total, winner and margin, top scorer, best bowler.
- Each object:
{
  "fixture": "<fixture key>",
  "toss": { "winner": "<team key or A/B>", "decision": "BAT" },
  "innings": [
    { "battingOrder": ["P01", "..."], "overs": [ { "bowler": "P09", "balls": "1 . 4 wd 2 W:c:P12 1" }, ... ] },
    { "battingOrder": ["P08", "..."], "overs": [ ... ] }
  ],
  "expected": { "winner": "<team key or A/B, null for a tie>", "margin": "12 runs" | "4 wickets" | "tie" },
  "notes": "one-line story of the match"
}
- "expected.margin" for a chase is wickets in hand = (players − 1) − wickets lost.

BEFORE YOU ANSWER — self-check every innings, over by over:
  a) count legal balls in each over = 6 (except a legitimately shortened last over);
  b) write the running team total at the end of each over in your head and confirm the chase stops on the winning ball;
  c) count wickets ≤ players − 1 and stop at all out;
  d) check no bowler bowls consecutive overs or more than 2;
  e) check every fielder/bowler key belongs to the fielding side.

PLAYERS, TEAMS AND FIXTURES (keys are fixed — use them exactly)

### PPK — Phatta Patakhe (Group A)
- P01 Md Waqar Moid — RHB, RA spin — captain
- P02 Challa Umesh Varun — LHB, LA pace
- P03 V Mouliprasanna — RHB, RA spin
- P04 Subhankar Sutradhar — RHB, RA spin
- P05 Kamatam Akshay Reddy — RHB, RA pace
- P06 M Adnan Khan — RHB, RA spin
- P07 Pranav Krishna — RHB, does not bowl — wicket-keeper

### MMX — Midnight Maggi XI (Group A)
- P08 Ayush Jha — LHB, does not bowl — captain, wicket-keeper
- P09 Om Gupta — RHB, LA spin
- P10 Akshat Sharma — LHB, RA spin
- P11 Yash Upadhyay — RHB, LA spin
- P12 Krish Vijay Tiwari — RHB, RA spin
- P13 Bipin Kumar Jaiswal — LHB, RA pace
- P14 Abhimanyu Solanki — LHB, does not bowl

### WCW — Wing C Wolves (Group A)
- P15 Karan Pratap Lohiya — RHB, RA pace — captain
- P16 Ashish Kumar Soni — RHB, RA pace
- P17 Shivam Kumar Shaw — RHB, does not bowl — wicket-keeper
- P18 Saksham Verma — RHB, RA spin
- P19 Jain Shlok Nilesh — RHB, LA pace
- P20 Gundeep Singh — LHB, does not bowl
- P21 Vedant Sinha — RHB, RA spin

### CTG — Canteen Tigers (Group A)
- P22 Atharv Phirke — RHB, RA spin — captain
- P23 Jatoth Shashi Vardan — RHB, LA spin
- P24 Kshitij Nema — LHB, does not bowl — wicket-keeper
- P25 Anirvan Tyagi — RHB, RA spin
- P26 Chaitanya Goel — RHB, does not bowl
- P27 Rahul Mandal — LHB, LA spin
- P28 Mitin Jangid — LHB, RA pace

### TTN — Tapri Titans (Group B)
- P29 Vibhu Yadav — RHB, RA pace — captain
- P30 Chitransh Gangwar — RHB, does not bowl — wicket-keeper
- P31 Tanush Khagwal — RHB, RA pace
- P32 Dweep Joshipura — RHB, RA pace
- P33 Gaurav Kumar — RHB, RA spin
- P34 Ashwin Barnwal — RHB, RA spin
- P35 Varun Malviya — RHB, does not bowl

### MKS — Mess Ke Sher (Group B)
- P36 Archit Kumar Gupta — RHB, RA pace — captain
- P37 Suyash Kumar — RHB, LA pace
- P38 Himanshu Sharma — RHB, RA pace
- P39 Mohit Sharma — RHB, LA pace
- P40 T Sukumar — RHB, LA spin
- P41 Mahir Jain — RHB, does not bowl — wicket-keeper
- P42 Vasam Vinay Kumar — LHB, does not bowl

### LKX — Lift Kharab XI (Group B)
- P43 Arul Gupta — RHB, LA spin — captain
- P44 Satwik Raj Wadhwa — RHB, LA spin
- P45 Tushar Dua — LHB, RA pace
- P46 Vidit Agarwal — RHB, does not bowl — wicket-keeper
- P47 Deep Mondal — LHB, LA spin
- P48 Rudransh Verma — RHB, RA pace
- P49 Monesh Patidar — RHB, does not bowl

### RTR — Rooftop Raiders (Group B)
- P50 Sachin Jain — RHB, RA spin — captain
- P51 Vatsal Mittal — RHB, RA pace
- P52 Vishnuprasad R — RHB, RA spin
- P53 Preet Mehta — RHB, LA spin
- P54 Daksh Niranjan Shettar — RHB, does not bowl — wicket-keeper
- P55 Shivam Yadav — RHB, RA pace
- P56 Aditya Nitin Patil — RHB, does not bowl

### Fixtures
- H12-M01 · Match 1 · 2026-10-24 16:00 IST · PPK v MMX · Group A
- H12-M02 · Match 2 · 2026-10-24 17:15 IST · TTN v MKS · Group B
- H12-M03 · Match 3 · 2026-10-25 16:00 IST · WCW v CTG · Group A
- H12-M04 · Match 4 · 2026-10-25 17:15 IST · LKX v RTR · Group B
- H12-M05 · Match 5 · 2026-10-26 16:00 IST · PPK v WCW · Group A
- H12-M06 · Match 6 · 2026-10-26 17:15 IST · TTN v LKX · Group B
- H12-M07 · Match 7 · 2026-10-27 16:00 IST · MMX v CTG · Group A
- H12-M08 · Match 8 · 2026-10-27 17:15 IST · MKS v RTR · Group B
- H12-M09 · Match 9 · 2026-10-28 16:00 IST · PPK v CTG · Group A
- H12-M10 · Match 10 · 2026-10-28 17:15 IST · TTN v RTR · Group B
- H12-M11 · Match 11 · 2026-10-29 16:00 IST · MMX v WCW · Group A
- H12-M12 · Match 12 · 2026-10-29 17:15 IST · MKS v LKX · Group B
- H12-SF1 · Semi-final 1 · 2026-10-31 16:00 IST · A1 v B2
- H12-SF2 · Semi-final 2 · 2026-10-31 17:15 IST · B1 v A2
- H12-FINAL · Final · 2026-11-01 16:30 IST · W:H12-SF1 v W:H12-SF2

### One-off fixtures (box cricket — anyone may bowl, no fixed keeper)
#### OO-01 — Wing C Box Cricket · 2026-09-13 18:30 IST · Hall 12 Courtyard · 6 overs a side · max 2 overs per bowler · 5-a-side
- Toss key "A" = Wing C: P01 Md Waqar Moid (RHB, RA spin), P57 Krishna Mehta (LHB, RA pace), P58 Cezan Vispi Damania (RHB, LA pace), P59 Harshvardhan Agarwal (LHB, RA spin), P60 Aurav Pratap Singh (RHB, RA spin)
- Toss key "B" = Wing D: P61 Sunny Kumar (RHB, RA pace), P62 Tejas Shrivastava (RHB, RA pace), P63 Yuvraj Kumar (RHB, LA spin), P64 Saurav Raj (RHB, RA spin), P65 Prateek Raj (RHB, RA spin)
#### OO-02 — Sunday Morning Gully · 2026-10-04 07:30 IST · Hall 12 Lawn · 4 overs a side · max 2 overs per bowler · 4-a-side
- Toss key "A" = Early Risers: P66 Shantanu Prakash (RHB, RA spin), P67 Eslavath Shiva (RHB, LA pace), P08 Ayush Jha (LHB), P15 Karan Pratap Lohiya (RHB, RA pace)
- Toss key "B" = Night Owls: P68 Chinmay Singh (LHB, RA spin), P69 Kavuri Goutham Chandra (RHB, LA spin), P22 Atharv Phirke (RHB, RA spin), P29 Vibhu Yadav (RHB, RA pace)
#### OO-03 — Post-Diwali Friendly · 2026-11-14 16:45 IST · Hall 12 Ground, IIT Kanpur · 5 overs a side · max 2 overs per bowler · 5-a-side
- Toss key "A" = Second Floor: P02 Challa Umesh Varun (LHB, LA pace), P36 Archit Kumar Gupta (RHB, RA pace), P43 Arul Gupta (RHB, LA spin), P50 Sachin Jain (RHB, RA spin), P70 Samanyu Arora (RHB, RA spin)
- Toss key "B" = Third Floor: P71 Vishal Kumar (RHB, RA pace), P72 Advaith G S (RHB, LA spin), P10 Akshat Sharma (LHB, RA spin), P24 Kshitij Nema (LHB), P47 Deep Mondal (LHB, LA spin)

Reply only "Ready" to this message. I will then ask for one batch at a time.
```

---

## 1 · STEP 1 — one-off matches

```text
Write the scoresheets for the three one-off fixtures OO-01, OO-02 and OO-03 (toss winner key is "A" or "B" as listed).
Story: OO-01 Wing C v Wing D is a tight 6-over chase that is won with 2–4 balls to spare; OO-02 is a low-scoring 4-over early-morning game defended by under 8 runs; OO-03 Second Floor v Third Floor is a 5-over slog where one side crosses 55.
Remember: all out = 4 wickets in 5-a-side, 3 wickets in 4-a-side. Max 2 overs per bowler, no consecutive overs. Output one JSON array with 3 objects.
```

## 2 · STEP 2 — Group A (6 matches)

```text
Write the scoresheets for the six Group A fixtures H12-M01, H12-M03, H12-M05, H12-M07, H12-M09, H12-M11 (10 overs, 7-a-side, keepers never bowl).
Storyline (keep it, but let the ball-by-ball decide margins):
- Phatta Patakhe (PPK, captain Md Waqar Moid) win 2 of 3 — including a last-over chase against Wing C Wolves — and lose one close game.
- Wing C Wolves (WCW) also win 2 of 3 (PPK beat them, they beat the other two), Midnight Maggi XI win 1, Canteen Tigers win 1 (a big upset). That is 6 wins in 6 games. PPK and WCW finish level on 4 points, so net run rate decides who tops the group — keep their margins different.
- Md Waqar Moid has one standout innings (30–45) and one 2-wicket spell; spread the other performances realistically across all four teams.
Output one JSON array with 6 objects, in match order.
```

## 3 · STEP 3 — Group B (6 matches)

```text
Write the scoresheets for the six Group B fixtures H12-M02, H12-M04, H12-M06, H12-M08, H12-M10, H12-M12.
Storyline: Tapri Titans (TTN) win all 3 (at least one by 25+ runs). Lift Kharab XI, Rooftop Raiders and Mess Ke Sher each beat exactly one of the other two (LKX beat RTR, RTR beat MKS, MKS beat LKX), so all three finish on 2 points and second place is decided on net run rate — make the margins in those three games clearly different. Include one low-scoring thriller (both sides under 75) and one run-fest (a side over 120).
Output one JSON array with 6 objects, in match order.
```

## 4 · STEP 4 — semi-finals

Run `npm run seed:check` first and paste its **points table** and **knockout fixtures** block in place of `<PASTE>`.

```text
Here is the computed points table and the semi-final pairings from my app (these are final — use exactly these teams, the order "Team A v Team B" is how the app lists them):
<PASTE>

Write the scoresheets for H12-SF1 and H12-SF2. The squads are the same as in the master context. Toss winner must be one of the two team keys in that semi-final.
Storyline: one semi-final is a comfortable win (20+ runs or 4+ wickets), the other goes to the last over. No ties.
Output one JSON array with 2 objects.
```

## 5 · STEP 5 — final

Run `npm run seed:check` again and paste the **SF results** lines.

```text
Semi-final results from my app:
<PASTE>

Write the scoresheet for H12-FINAL between the two semi-final winners (team listed first in the app = winner of SF1). Make it the best game of the league: a 1st-innings total between 95 and 115 and a chase that is decided in the 10th over, with a key run out or a stumping in the last two overs. No tie.
Output one JSON array with 1 object.
```

## ↺ · FIX prompt (use whenever seed:check prints errors)

```text
My validator rejected these scoresheets. Fix ONLY what the errors point to, keep everything else (storyline, players, toss) the same, and re-check the running totals after your fix. Return the complete corrected scoresheet objects for just these fixtures as one JSON array.

<PASTE the ERROR lines here>
```

Tip: if a warning says `expected says … but the balls add up to …`, either accept the computed result (just update "expected") or ask Gemini to change a few balls in the last two overs.
