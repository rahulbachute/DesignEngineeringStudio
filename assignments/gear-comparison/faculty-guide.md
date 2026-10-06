# EA-TS-03 Faculty Evaluation Guide: Comparison of Spur and Helical Gears in Industrial Power Transmission

## Course Information
- **Course:** PCC353-MEC — Transmission System Design (SPPU 2024 Pattern)
- **Unit:** Unit I — Spur and Helical Gears
- **Course Outcome:** CO1: Apply principle of Spur & Helical gear design for industrial application.
- **Assignment ID:** EA-TS-03
- **Assignment Slug:** gear-comparison
- **Total CCE Weightage:** 12.0 Marks (9.0 Automated + 3.0 Faculty Evaluation)

## Syllabus Compliance Directive (SPPU PCC353-MEC)
The SPPU syllabus strictly mandates: *"No numerical on force analysis of helical"*.
Accordingly, this assignment contains **zero numerical force analysis or thrust calculations** for helical gears. All helical force vector relationships ($F_t, F_r, F_a$, and $F_a = F_t \tan\beta$) are evaluated conceptually, vectorially, and directionally.

## Evaluation Philosophy & Mark Distribution
- **Automated Assessment (9.0 Marks across Activities 1–9):**
  - Activity 1 (0.5 M): Engineering Problem Charter & Technical Scope
  - Activity 2 (1.0 M): Component Callout Mapping (10 callouts $\times$ 0.1 M)
  - Activity 3 (1.0 M): Gear-Type Identification & Geometric Architecture (4 questions $\times$ 0.25 M)
  - Activity 4 (1.0 M): Tooth Engagement Kinematics & Contact Line Mechanics (4 questions $\times$ 0.25 M)
  - Activity 5 (1.0 M): Force Characteristics & 3D Force Vector Resolution (4 questions $\times$ 0.25 M)
  - Activity 6 (1.0 M): Bearing Consequences & Shaft Mounting Integration (4 questions $\times$ 0.25 M)
  - Activity 7 (1.0 M): Dynamic Transmission Behaviour, Noise & Velocity Limits (4 questions $\times$ 0.25 M)
  - Activity 8 (1.0 M): Manufacturing Processes, Capital Cost & Maintenance (4 questions $\times$ 0.25 M)
  - Activity 9 (1.5 M): Industrial Application Requirement Matrix (6 profiles $\times$ 0.25 M)
- **Faculty Evaluation (3.0 Marks across Activities 10–11):**
  - Activity 10 (1.5 M): Criterion **TS03-C10** — Engineering Decision Canvas & Trade-Off Defense
  - Activity 11 (1.5 M): Criterion **TS03-C11** — Professional Reflection & Transmission Design Synthesis

---

## Faculty Evaluation Rubrics

### TS03-C10: Engineering Decision Canvas & Trade-Off Defense (1.5 Marks)
*Prompt: "Select one industrial client application (Application A: Low-Speed Bucket Elevator, Application B: High-Speed Centrifugal Blower, or Application C: Mining Slurry Pump). Recommend the appropriate gear technology and provide a comprehensive, defensible technical decision covering speed, acoustic limits, bearing arrangements, housing stiffness, and lifecycle economics."*

| Performance Band | Marks | Evaluation Criteria |
| :--- | :---: | :--- |
| **Exemplary (L5/L6)** | **1.25 – 1.50** | Student provides a thorough, technically sound defense tailored to the chosen application. Correctly identifies governing drivers: **Application A** (Spur Gear: low pitch-line velocity $v < 3\text{ m/s}$ makes noise negligible; zero axial thrust allows economical standard radial bearings and simple field maintenance in dusty conditions); **Application B** (Helical Gear: elevated pitch velocity $v > 12\text{ m/s}$ and strict acoustic limit $< 75\text{ dBA}$ mandate progressive tooth overlap to prevent gear whine; defends paired tapered roller or angular contact bearings with rigid housing retention); or **Application C** (defends choice based on heavy shock, torque density, or slurry maintenance trade-offs). Evaluates casing stiffness, bearing arrangements, and lifecycle economics without dogmatic bias. |
| **Competent (L4/L5)** | **0.75 – 1.20** | Recommends the correct gear type with sound general reasoning. Minor omissions in bearing retention details, casing rigidity justification, or manufacturing cost balance. |
| **Developing (L2/L3)** | **0.25 – 0.70** | Recommends gear type but offers superficial defense, generic bullet points, or fails to connect operating parameters (velocity, noise, thrust) to the chosen machine. |
| **Unacceptable** | **0.00** | Missing defense, incorrect technical reasoning, or complete misunderstanding of spur versus helical mechanical characteristics. |

---

### TS03-C11: Professional Reflection & Transmission Design Synthesis (1.5 Marks)
*Prompt: "Synthesize the fundamental mechanical differences between spur and helical gears, formulate a 3-point rule-of-thumb decision guide for junior designers, and reflect on the trade-offs between initial capital cost, operational smoothness, bearing complexity, and total lifecycle reliability."*

| Performance Band | Marks | Evaluation Criteria |
| :--- | :---: | :--- |
| **Exemplary (L5/L6)** | **1.25 – 1.50** | Synthesizes fundamental principles with professional maturity: (1) Explains tooth engagement mechanics (sudden full face line contact in spur vs progressive diagonal contact line in helical) and resulting 2D vs 3D force resolution; (2) Articulates a clear, actionable 3-point decision heuristic for junior engineers (e.g., Velocity threshold $v \approx 8\text{--}10\text{ m/s}$; Noise/vibration sensitivity; Axial thrust & bearing budget feasibility); (3) Provides balanced reflection on total cost of ownership (TCO), recognizing that higher initial capital expenditure for helical gearing and thrust bearings is justified when high speeds or acoustic standards demand smooth power transmission. |
| **Competent (L3/L4)** | **0.75 – 1.20** | Covers all three synthesis prompts with solid understanding. 3-point heuristic is reasonable but could be more specific regarding quantitative thresholds or bearing considerations. |
| **Developing (L2)** | **0.25 – 0.70** | Superficial or generic reflection. Heuristic lacks actionable engineering rules; weak connection to lifecycle economics. |
| **Unacceptable** | **0.00** | Incomplete, copied, or absent synthesis. |

---

## Authoritative Benchmark Keys (Activities 1–9)

### Activity 2: Component Callout Mapping
- 1: Input shaft — Spur drive
- 2: Driving spur pinion
- 3: Driven spur gear *(Complete driven gear wheel)*
- 4: Output shaft — Spur drive
- 5: Support bearing — Spur shaft
- 6: Input shaft — Helical drive
- 7: Driving helical pinion
- 8: Driven helical gear *(Complete driven gear wheel)*
- 9: Output shaft — Helical drive
- 10: Support bearing — Helical shaft

### Activity 3: Geometric Architecture
- q3_1: Spur parallel to shaft axis; Helical inclined along cylindrical helix at angle $\beta$
- q3_2: $m_t = m_n / \cos\beta$
- q3_3: $\tan\alpha_t = \tan\alpha_n / \cos\beta$
- q3_4: $z' = z / \cos^3\beta$

### Activity 4: Tooth Engagement Kinematics
- q4_1: Instantaneous line contact across entire active face width simultaneously
- q4_2: Begins at leading edge point, extends diagonally across face width (progressive)
- q4_3: Spur lines parallel to axis; Helical lines inclined diagonally across flank
- q4_4: Significantly smoother meshing, reduced dynamic impact, lower vibration/noise

### Activity 5: Force Characteristics
- q5_1: Spur: $F_t$ (tangential), $F_r$ (radial separating), $F_a = 0$ (zero axial)
- q5_2: Helical: $F_t$ (tangential), $F_r$ (radial), $F_a$ (axial thrust parallel to shaft)
- q5_3: Originates from helix angle $\beta$, conceptually $F_a = F_t \tan\beta$
- q5_4: Hand of helix (RH/LH), role (driving/driven), and rotation direction

### Activity 6: Bearing Consequences
- q6_1: Standard deep-groove ball or cylindrical roller bearings ($F_a = 0$)
- q6_2: Helix angle generates continuous axial thrust $F_a$ needing housing reaction
- q6_3: Tapered roller bearings (opposed) or angular contact ball bearing pairs
- q6_4: Rigid housing walls, end-covers, locknuts/shims to react axial thrust

### Activity 7: Dynamic Behaviour & Noise
- q7_1: Spur has transverse contact ratio ($\approx 1.2\text{--}1.7$); Helical has total contact ratio $\epsilon_\gamma = \epsilon_\alpha + \epsilon_\beta$ ($\approx 2.5\text{--}3.5+$)
- q7_2: Spur: low-to-moderate speeds ($v < 8\text{--}10\text{ m/s}$); Helical: higher speeds ($v > 10\text{--}30+\text{ m/s}$)
- q7_3: Higher Barth factor $C_v$ for precision helical reduces dynamic load penalty
- q7_4: Continuous overlap drastically suppresses gear whine ($< 75\text{ dBA}$)

### Activity 8: Manufacturing & Maintenance
- q8_1: Straight-axis hobbing/shaping without helix lead synchronization
- q8_2: Spur is forgiving of axial displacement; Helical is sensitive to axial position/lead
- q8_3: Lower replacement cost, off-the-shelf radial bearings, simple assembly
- q8_4: Justified when high speed, low noise, or high torque density demand smooth mesh

### Activity 9: Selection Matrix (6 Profiles)
1. Cement Apron Conveyor ($v = 1.2\text{ m/s}$): **Spur Gear** (low velocity, zero thrust, rugged maintenance)
2. EV Reduction Gearbox ($v = 25\text{ m/s}$, $< 65\text{ dBA}$): **Helical Gear** (high speed, cabin noise limit, overlap)
3. Overhead Crane Hand Winch: **Spur Gear** (manual, negligible dynamics, simple radial bushings)
4. Centrifugal Gas Compressor ($v = 18\text{ m/s}$, 24/7): **Helical Gear** (high velocity, high $C_v$, continuous duty)
5. Agricultural Seed Planter ($v < 0.5\text{ m/s}$): **Spur Gear** (sub-1 m/s, open dirty environment, axial tolerance)
6. Paper Mill Drying Cylinder ($v = 14\text{ m/s}$): **Helical Gear** (smooth engagement eliminates chatter marks on paper)
