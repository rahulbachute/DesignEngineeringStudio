# EA-TS-02 Faculty Evaluation Guide: Design Parameters of Spur Gears for Industrial Conveyor Systems

## Course Information
- **Course:** PCC353-MEC — Transmission System Design (SPPU 2024 Pattern)
- **Unit:** Unit I — Spur and Helical Gears
- **Course Outcome:** CO1: Apply principle of Spur & Helical gear design for industrial application.
- **Assignment ID:** EA-TS-02
- **Total CCE Weightage:** 12.0 Marks (9.0 Automated Calculations + 3.0 Faculty Evaluation)

## Evaluation Philosophy & MEILP Principle
- **Automated Assessment (9.0 Marks / 38 Checkpoints):** All deterministic mathematical calculations (kinematic ratio, torque, pitch diameters, centre distance, Lewis form factors, weaker element identification, pitch-line velocity, Barth dynamic factor, tangential force, effective dynamic load, Lewis beam strength, Buckingham wear strength, initial factors of safety, failure diagnosis, and parametric redesign iterations) are objectively assessed by the automated evaluation engine within strict engineering tolerances ($\pm 1.0\%$ to $\pm 2.5\%$).
- **Faculty Evaluation (3.0 Marks):** Reserved exclusively for genuine open-ended engineering judgement, trade-off defense, and professional reflection. Faculty evaluate Criteria **TS02-C11** (1.5 Marks) and **TS02-C12** (1.5 Marks).

## Faculty Evaluation Rubrics

### TS02-C11: Engineering Redesign Trade-Off Defense & Selection (1.5 Marks)
*Prompt: "Select and defend your engineering redesign recommendation to achieve FOS >= 1.50. Evaluate the operational, dimensional, and economic trade-offs between surface hardening and module upsizing."*

| Performance Band | Marks | Evaluation Criteria |
| :--- | :---: | :--- |
| **Exemplary (L5/L6)** | **1.25 – 1.50** | Student clearly articulates the trade-off between: (1) Surface hardening 55C8 gear teeth to 400 BHN (maintains compact standard centre distance $a = 160.00\text{ mm}$ and existing gearbox casing, requiring flame/induction hardening of 55C8 plain carbon steel); and (2) Increasing module to $m = 5\text{ mm}, b = 60\text{ mm}$ (uses normalized steel but increases centre distance to $a = 200.00\text{ mm}$, representing a $+25\%$ increase in casing envelope and mass). Recommends either option with sound mechanical and economic justification without dogmatic bias. |
| **Competent (L4/L5)** | **0.75 – 1.20** | Recommends a valid redesign (400 BHN or $m = 5\text{ mm}$) with correct quantitative safety factors, but provides limited analysis of casing dimensions or heat-treatment feasibility. |
| **Developing (L2/L3)** | **0.25 – 0.70** | Recommends an option without sound mechanical reasoning, or erroneously recommends Option A ($b = 60\text{ mm}$) despite failing the target safety factor ($\text{FOS}_w = 1.034 < 1.50$). |
| **Unacceptable** | **0.00** | Missing justification or complete misunderstanding of the failure modes. |

### TS02-C12: Professional Reflection & Engineering Synthesis (1.5 Marks)
*Prompt: "Document your key engineering assumptions, summarize the final transmission specification, and reflect on the role of dynamic velocity factors and surface fatigue in industrial spur gear design."*

| Performance Band | Marks | Evaluation Criteria |
| :--- | :---: | :--- |
| **Exemplary (L5/L6)** | **1.25 – 1.50** | Thoroughly summarizes the final design specifications, explicitly lists engineering assumptions (rigid shaft mounting, accurately generated teeth, steady conveyor operation), and explains why heavy conveyor spur gear drives are typically governed by contact fatigue (pitting) rather than tooth bending breakage. |
| **Competent (L3/L4)** | **0.75 – 1.20** | Summarizes gear parameters with reasonable reflection on dynamic loading and surface wear. Minor gaps in assumption documentation. |
| **Developing (L2)** | **0.25 – 0.70** | Superficial reflection, copied text, or incomplete design summary. |
| **Unacceptable** | **0.00** | Missing synthesis, absent reflection, or incoherent engineering notes. |

## Authoritative Benchmark Solution (Zero Drift)
- Motor Input: $P = 11.0\text{ kW}, \quad N_1 = 960\text{ rpm}, \quad N_2 = 320\text{ rpm}$
- Kinematic Ratio: $i = 3.00$
- Pinion Torque: $T_1 = 109,419.02\text{ N}\cdot\text{mm}$
- Output Torque: $T_2 = 328,257.06\text{ N}\cdot\text{mm}$
- Pitch Circle Diameters: $d_1 = 80.00\text{ mm}, \quad d_2 = 240.00\text{ mm}$
- Standard Centre Distance: $a = 160.00\text{ mm}$
- Lewis Form Factors: $Y_1 = 0.3405, \quad Y_2 = 0.4362$
- Permissible Stresses: $\sigma_{b1} = 266.67\text{ MPa}, \quad \sigma_{b2} = 200.00\text{ MPa}$
- Strength Products: Pinion $= 90.80\text{ MPa}, \quad$ Gear $= 87.24\text{ MPa} \implies$ **Gear is Weaker**
- Pitch-Line Velocity: $v = 4.0212\text{ m/s}$
- Barth Velocity Factor: $C_v = 0.7363$
- Tooth Loads: $P_t = 2735.48\text{ N}, \quad P_{\text{eff}} = 6965.67\text{ N}$
- Lewis Beam Strength & FOS: $S_b = 13,957.33\text{ N}, \quad \text{FOS}_b = 2.00\text{ (SAFE)}$
- Buckingham Wear Strength & FOS: $Q = 1.50, \quad K = 1.00\text{ N/mm}^2, \quad S_w = 4800.00\text{ N}, \quad \text{FOS}_w = 0.689\text{ (UNSAFE)}$
- Initial Failure Diagnosis: Surface Wear / Pitting Fatigue
- Option A ($b = 60\text{ mm}$): $S_w = 7200.00\text{ N}, \quad \text{FOS}_w = 1.034\text{ (INSUFFICIENT)}$
- Option B ($400\text{ BHN}$): $K = 2.56\text{ N/mm}^2, \quad S_w = 12,288.00\text{ N}, \quad \text{FOS}_w = 1.764\text{ (SATISFIES TARGET)}$
- Option C ($m = 5\text{ mm}, b = 60\text{ mm}$): $d_1 = 100.00\text{ mm}, \quad P_{\text{eff}} = 5745.89\text{ N}, \quad S_w = 9000.00\text{ N}, \quad \text{FOS}_w = 1.566\text{ (SATISFIES TARGET)}$
