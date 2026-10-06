# EA-TS-01 Faculty Evaluation Guide: Design of Helical Gears for High-Speed Rotary Equipment

## Course Information
- **Course:** PCC353-MEC — Transmission System Design (SPPU 2024 Pattern)
- **Unit:** Unit I — Spur and Helical Gears
- **Course Outcome:** CO1: Apply principle of Spur & Helical gear design for industrial application.
- **Assignment ID:** EA-TS-01
- **Total CCE Weightage:** 12.0 Marks (9.0 Automated Calculations + 3.0 Faculty Evaluation)

## Evaluation Philosophy & MEILP Principle
- **Automated Assessment (9.0 Marks / 38 Checkpoints):** All deterministic mathematical calculations (torque, virtual teeth, Lewis factor, pitch diameters, pitch velocity, Barth velocity factor, tangential force, effective load, beam strength, wear strength, initial safety factors, defect diagnosis, and parametric redesign iterations) are objectively assessed by the automated evaluation engine within strict engineering tolerances ($\pm 1.0\%$ to $\pm 2.5\%$).
- **Faculty Evaluation (3.0 Marks):** Reserved exclusively for genuine engineering judgement, trade-off analysis, justification, and synthesis. Faculty evaluate Criteria **TS01-C11** (1.5 Marks) and **TS01-C12** (1.5 Marks).

## Faculty Evaluation Rubrics

### TS01-C11: Engineering Recommendation & Trade-Off Defense (1.5 Marks)
*Prompt: "Select and defend your engineering redesign recommendation to achieve FOS >= 1.50. Evaluate the operational and dimensional trade-offs between surface hardening and module upsizing."*

| Performance Band | Marks | Evaluation Criteria |
| :--- | :---: | :--- |
| **Exemplary (L5/L6)** | **1.25 – 1.50** | Student clearly articulates the trade-off between: (1) Increasing surface hardness to 350 BHN (maintains compact centre distance $a = 153.24\text{ mm}$ and existing casing envelope, requires surface hardening such as induction/flame hardening on 55C8 plain carbon steel); and (2) Increasing module to $m_n = 5\text{ mm}$ (uses normalized steel but expands centre distance to $a = 191.55\text{ mm}$, $+25\%$ increase in casing size and mass). Recommends a feasible option with sound mechanical justification. |
| **Competent (L4/L5)** | **0.75 – 1.20** | Recommends a valid redesign (350 BHN or $m_n = 5\text{ mm}$) and quotes calculated safety factors accurately, but offers limited discussion of casing envelope or heat treatment feasibility. |
| **Developing (L2/L3)** | **0.25 – 0.70** | Recommends an option without sound mechanical reasoning, or erroneously recommends Option A ($b = 55\text{ mm}$) despite failing the safety requirement ($\text{FOS}_w = 1.19 < 1.50$). |
| **Unacceptable** | **0.00** | Missing justification or complete misunderstanding of the failure criteria. |

### TS01-C12: Engineering Design Synthesis & Reflection (1.5 Marks)
*Prompt: "Document your engineering assumptions, summarize the final design specification, and reflect on the role of dynamic velocity factors and surface fatigue in high-speed rotary equipment design."*

| Performance Band | Marks | Evaluation Criteria |
| :--- | :---: | :--- |
| **Exemplary (L5/L6)** | **1.25 – 1.50** | Thoroughly summarizes the final design specifications, explicitly lists engineering assumptions (Barth factor accuracy class, steady motor drive, continuous duty), and explains why high-speed helical gear sets are typically governed by contact fatigue/pitting rather than beam bending failure. |
| **Competent (L3/L4)** | **0.75 – 1.20** | Summarizes gear parameters with reasonable reflection on dynamic loading and surface wear. Minor gaps in assumption documentation. |
| **Developing (L2)** | **0.25 – 0.70** | Superficial reflection, copied text, or incomplete design summary. |
| **Unacceptable** | **0.00** | Missing synthesis, absent reflection, or incoherent engineering notes. |

## Authoritative Benchmark Solution (Zero Drift)
- Pinion Torque: $T_1 = 99,471.84\text{ N}\cdot\text{mm}$
- Virtual Teeth: $z_1' = 21.69, \quad z_2' = 65.08$
- Lewis Form Factors: $Y_{v1} = 0.3517, \quad Y_{v2} = 0.4399$
- Weaker Element: Gear (55C8 plain carbon steel, $\sigma_b Y_v = 87.98\text{ MPa}$ vs Pinion $93.79\text{ MPa}$)
- Pitch Diameters: $d_1 = 76.62\text{ mm}, \quad d_2 = 229.86\text{ mm}, \quad a = 153.24\text{ mm}$
- Velocity & Barth Factor: $v = 5.78\text{ m/s}, \quad C_v = 0.6997 \approx 0.700$
- Loads: $P_t = 2596.47\text{ N}, \quad P_{\text{eff}} = 6030.20\text{ N}$
- Beam Strength & FOS: $S_b = 14,076.78\text{ N}, \quad \text{FOS}_b = 2.33\text{ (SAFE)}$
- Wear Strength & FOS: $S_w = 5206.27\text{ N}, \quad \text{FOS}_w = 0.86\text{ (UNSAFE)}$
- Governing Defect: Surface Wear / Pitting Failure
- Option A ($b = 55\text{ mm}$): $S_w = 7158.61\text{ N}, \quad \text{FOS}_w = 1.19\text{ (Insufficient)}$
- Option B1 ($350\text{ BHN}$): $K = 1.96\text{ N/mm}^2, \quad S_w = 10,204.28\text{ N}, \quad \text{FOS}_w = 1.69\text{ (Satisfies Target)}$
- Option C ($m_n = 5\text{ mm}, b = 50\text{ mm}$): $d_1 = 95.78\text{ mm}, \quad P_{\text{eff}} = 4995.16\text{ N}, \quad S_w = 8134.79\text{ N}, \quad \text{FOS}_w = 1.63\text{ (Satisfies Target)}$
