# EA-TS-04 Faculty Evaluation Guide: Analysis of Spur Gears in a Car Transmission System

## Course & Assessment Context
- **Course:** PCC353-MEC — Transmission System Design (SPPU 2024 Course Pattern)
- **Unit:** Unit I — Spur and Helical Gears
- **Course Outcome:** CO1: Apply principle of Spur & Helical gear design for industrial application.
- **Assignment ID:** EA-TS-04
- **Slug:** `automotive-spur-gear-analysis`
- **Total Marks:** 12.0 Marks (9.0 Automated System Grading + 3.0 Faculty Evaluation)
- **Difficulty:** Advanced | **Duration:** 75–90 minutes

---

## 1. Assessment Architecture & Scoring Model

The assessment is split into **9.0 Automated Marks** and **3.0 Faculty-Assessed Marks**:

| Criterion | Task / Step | Title | Max Marks | Assessment Mode |
| :---: | :--- | :--- | :---: | :---: |
| **TS04-C01** | `project-charter` | Automotive transmission requirement & torque | 0.5 | Automated |
| **TS04-C02** | `transmission-kinematics` | Gear ratio, geometry & pitch dimensions | 1.0 | Automated |
| **TS04-C03** | `spur-gear-forces` | Spur gear force analysis | 1.0 | Automated |
| **TS04-C04** | `dynamic-loading` | Velocity factor & effective load | 1.0 | Automated |
| **TS04-C05** | `lewis-beam-strength` | Lewis form factor & weaker member | 1.0 | Automated |
| **TS04-C06** | `lewis-beam-strength` | Lewis beam strength & bending FOS | 1.0 | Automated |
| **TS04-C07** | `buckingham-wear-analysis` | Buckingham wear strength & wear FOS | 1.5 | Automated |
| **TS04-C08** | `failure-diagnosis` | Failure diagnosis & adequacy assessment | 1.0 | Automated |
| **TS04-C09** | `gear-adequacy-assessment` | Deterministic engineering conclusion | 1.0 | Automated |
| **TS04-C10** | `engineering-recommendation` | Engineering recommendation & justification | 1.5 | Faculty Assessed |
| **TS04-C11** | `reflection-synthesis` | Professional synthesis & reflection | 1.5 | Faculty Assessed |
| **—** | **TOTAL** | | **12.0** | **9.0 Auto + 3.0 Faculty** |

---

## 2. Master Solution Key (Activities 1–9: Automated)

### Activity 1: Charter & Scope (`TS04-C01`, 0.5 M)
- Prime mover: Delivered power $P = 8.0\text{ kW}$ at $N_1 = 1200\text{ rpm}$.
- Reverse train: Input shaft $\to$ Pinion ($z_1 = 20$) $\to$ Reverse idler $\to$ Gear ($z_2 = 60$) $\to$ Output shaft ($N_2 = 400\text{ rpm}$).
- Kinematic ratio: $i = 3.00$. Idler reverses direction with zero change to ratio magnitude.
- SPPU syllabus boundary confirmed: No numerical on helical force analysis.

### Activity 2: Gearbox Visualisation (`TS04-A02`, 0.0 M)
- Callouts 1–10 correctly identified:
  1. Engine Flywheel & Friction Clutch Assembly
  2. Transmission Input Shaft (1200 rpm)
  3. Reverse Driving Spur Pinion (z1 = 20 teeth)
  4. Reverse Idler Spur Gear (Direction Inverter)
  5. Idler Stub Shaft & Needle Roller Bearings
  6. Reverse Driven Spur Gear (z2 = 60 teeth)
  7. Transmission Output Shaft (400 rpm)
  8. Transmission Housing & Deep-Groove Ball Bearings
  9. Reverse Power Flow Path (Input → Idler → Driven Gear)
  10. Spur Tooth Meshing Pitch Point (20° Pressure Angle)

### Activity 3: Kinematics & Dimensions (`TS04-C02`, 1.0 M)
- $i = 3.00$
- $T_1 = 63,661.98\text{ N}\cdot\text{mm}$
- $d_1 = 60.00\text{ mm}$
- $d_2 = 180.00\text{ mm}$
- $a = 120.00\text{ mm}$

### Activity 4: Spur Gear Force Analysis (`TS04-C03`, 1.0 M)
- $P_t = 2,122.07\text{ N}$ ($2 T_1 / d_1$)
- $P_r = 772.37\text{ N}$ ($P_t \tan 20^\circ$)
- $P_n = 2,258.28\text{ N}$ ($P_t / \cos 20^\circ$)

### Activity 5: Dynamic Loading (`TS04-C04`, 1.0 M)
- $v = 3.770\text{ m/s}$ ($\pi d_1 N_1 / 60000$)
- $C_v = 0.6141$ ($6 / (6 + v)$)
- $P_{\text{eff}} = 6,478.87\text{ N}$ ($C_s K_m P_t / C_v$ with $C_s = 1.50, K_m = 1.25$)

### Activity 6: Lewis Beam Strength (`TS04-C05` & `TS04-C06`, 2.0 M)
- $\sigma_{b1} = 233.33\text{ MPa}$ ($700 / 3$), $\sigma_{b2} = 200.00\text{ MPa}$ ($600 / 3$)
- $Y_1 = 0.320$, $Y_2 = 0.421$ (Authoritative table values)
- Weaker member: **Pinion** ($\sigma_{b1} Y_1 = 74.67\text{ MPa} < \sigma_{b2} Y_2 = 84.20\text{ MPa}$)
- $S_{b1} = 11,200.00\text{ N}$, $S_{b2} = 12,630.00\text{ N}$
- $\text{FOS}_b = 1.729 \ge 1.50 \implies \mathbf{SAFE}$

### Activity 7: Buckingham Wear Analysis (`TS04-C07`, 1.5 M)
- $Q = 1.50$ ($2 \times 60 / (20 + 60)$)
- $K = 1.96\text{ N/mm}^2$ ($0.16 \times (350/100)^2$)
- $S_w = 8,820.00\text{ N}$ ($b \cdot Q \cdot d_1 \cdot K = 50 \times 1.50 \times 60 \times 1.96$)
- $\text{FOS}_w = 1.361 < 1.50 \implies \mathbf{NOT\ SAFE}$

### Activity 8: Failure Diagnosis (`TS04-C08`, 1.0 M)
- Correct diagnosis: Bending is safe ($\text{FOS}_b = 1.729$), wear is unsafe ($\text{FOS}_w = 1.361$).
- **Governing failure mode:** Flank surface wear / contact pitting fatigue.

### Activity 9: Gear Adequacy Assessment (`TS04-C09`, 1.0 M)
- Deterministic decision: Overall initial design is **NOT ADEQUATE**. Engineering redesign required.

---

## 3. Faculty Scoring Rubric (Activities 10 & 11: 3.0 Marks)

### Activity 10: Engineering Recommendation & Defense (`TS04-C10`, 1.5 Marks)
Evaluates student engineering recommendation, trade-off defense, packaging considerations, and manufacturing feasibility.

| Performance Band | Marks | Descriptive Criteria |
| :--- | :---: | :--- |
| **Exemplary** | **1.25 – 1.50** | Recommends a technically rigorous modification (e.g., surface hardening to 400 BHN giving $K = 2.56\text{ N/mm}^2$, $S_w = 11,520\text{ N}$, $\text{FOS}_w = 1.778 \ge 1.50$, or face width/geometry optimization). Thoroughly analyzes packaging constraints, noting preservation of centre distance ($a = 120\text{ mm}$) and gearbox casing envelope. Evaluates heat treatment methods (induction/carburizing) vs retooling economics. |
| **Proficient** | **0.80 – 1.20** | Recommends a valid technical direction with correct calculations. Mentions packaging envelope or manufacturing considerations, but lacks exhaustive depth on casing and heat treatment trade-offs. |
| **Developing** | **0.40 – 0.75** | Proposes a redesign (e.g. general hardening or larger teeth) with basic reasoning, but fails to address packaging constraints or calculations are incomplete. |
| **Unsatisfactory** | **0.00 – 0.35** | Superficial or incorrect recommendation (e.g. recommending helical gears despite syllabus constraints, or claiming unneeded changes). |

### Activity 11: Professional Synthesis & Reflection (`TS04-C11`, 1.5 Marks)
Evaluates synthesis across 3 reflection prompts (0.50 marks per prompt):

- **Prompt 1 (0.50 M) — Synthesis & Automotive Reverse Duty Cycle:**
  Synthesizes calculated parameters ($T_1 = 63,661.98\text{ N}\cdot\text{mm}, P_t = 2122.07\text{ N}, P_{\text{eff}} = 6478.87\text{ N}, \text{FOS}_b = 1.729, \text{FOS}_w = 1.361$). Explains why reverse gear trains experience high shock torques despite low cumulative mileage, and clarifies the idler gear kinematics.
- **Prompt 2 (0.50 M) — Root Bending vs Flank Pitting Fatigue Mechanics:**
  Distinguishes tensile cyclic bending fatigue leading to tooth shearing from Hertzian compressive contact fatigue leading to pit spalling. Explains why wear durability governed the design.
- **Prompt 3 (0.50 M) — Packaging Constraints & Production Economics:**
  Reflects on vehicle underbody packaging constraints, why preserving casing dimensions and centre distance ($a = 120\text{ mm}$) through surface hardening is preferred over casting alterations, and discusses production economics.
