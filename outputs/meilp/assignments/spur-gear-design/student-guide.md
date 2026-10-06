# EA-TS-02 Student Guide: Design Parameters of Spur Gears for Industrial Conveyor Systems

## Course Information
- **Course:** PCC353-MEC — Transmission System Design
- **Unit:** Unit I — Spur and Helical Gears
- **Course Outcome:** CO1: Apply principle of Spur & Helical gear design for industrial application.
- **Assignment ID:** EA-TS-02
- **CCE Total Marks:** 12.0 Marks (9.0 Automated Calculations + 3.0 Faculty Judgement & Synthesis)

## Engineering Scenario
You are a Mechanical Transmission Design Engineer in the Heavy Materials Handling & Conveyor Drive Division. You have been tasked with designing, verifying, and optimizing a single-stage spur gear reduction drive transmitting 11.0 kW from an electric motor running at 960 rpm to a bulk material conveyor head pulley operating at 320 rpm (transmission ratio $i = 3.00$).

## Learning Journey (MEILP Framework)
1. **Engineering Problem Charter:** Review conveyor operational brief, shock factors ($K_a = 1.50, K_m = 1.25$), and target safety threshold ($[\text{FOS}] \ge 1.50$).
2. **Conveyor Visualisation:** Inspect the industrial conveyor drive schematic and identify the 10 numbered drive components: Electric Motor (1), Input Shaft (2), Pinion Key (3), Driving Spur Pinion (4), Gear Teeth (5), Driven Gear (6), Gear Hub Key (7), Output Shaft (8), Head Pulley Drum (9), and Conveyor Belt (10).
3. **Transmission Requirements & Kinematic Parameters:** Calculate transmission ratio ($i = 3.00$), rated pinion torque ($T_1 = 109,419.02\text{ N}\cdot\text{mm}$), and output gear torque ($T_2 = 328,257.06\text{ N}\cdot\text{mm}$).
4. **Spur Gear Pitch Geometry & Centre Distance:** Calculate pitch circle diameters ($d_1 = 80.00\text{ mm}, d_2 = 240.00\text{ mm}$) and standard centre distance ($a = 160.00\text{ mm}$) with module $m = 4.0\text{ mm}$.
5. **Material Selection & Gear-Tooth Failure Evaluation:** Determine permissible bending stresses ($\sigma_b = S_{ut}/3$) and identify fundamental gear tooth failure modes.
6. **Lewis Form Factors & Beam Strength Calculation:** Calculate Lewis form factors ($Y_1 = 0.3405, Y_2 = 0.4362$), evaluate strength products to identify the weaker element (Gear: $55\text{C}8$ steel), and compute Lewis beam strength ($S_b = 13,957.33\text{ N}$) and bending safety factor ($\text{FOS}_b = 2.00 \ge 1.50$: SAFE).
7. **Pitch-Line Velocity & Dynamic Load Analysis:** Calculate pitch line velocity ($v = 4.02\text{ m/s}$), Barth dynamic velocity factor ($C_v = 0.7363$), tangential tooth load ($P_t = 2735.48\text{ N}$), and effective dynamic load ($P_{\text{eff}} = 6965.67\text{ N}$).
8. **Buckingham Wear Strength & Wear FOS Calculation:** Compute ratio factor ($Q = 1.50$), load-stress factor ($K = 1.00\text{ N/mm}^2$ for $250\text{ BHN}$ gear), Buckingham wear strength ($S_w = 4800.00\text{ N}$), and wear safety factor ($\text{FOS}_w = 0.689 < 1.50$: UNSAFE).
9. **Initial Failure Diagnosis & Root Cause Assessment:** Formulate diagnosis identifying surface wear/pitting contact fatigue as the governing deficiency.
10. **Parametric Redesign Computations:** Quantitatively evaluate:
    - Option A: Increase face width to $b = 60\text{ mm}$ ($S_w = 7200\text{ N}, \text{FOS}_w = 1.034$ — Insufficient).
    - Option B: Surface harden $55\text{C}8$ gear teeth to $400\text{ BHN}$ ($K = 2.56\text{ N/mm}^2, S_w = 12,288\text{ N}, \text{FOS}_w = 1.764$ — Satisfies Target).
    - Option C: Increase module to $m = 5\text{ mm}, b = 60\text{ mm}$ ($d_1 = 100\text{ mm}, P_{\text{eff}} = 5745.89\text{ N}, S_w = 9000\text{ N}, \text{FOS}_w = 1.566$ — Satisfies Target).
11. **Engineering Decision Canvas:** Perform comparative evaluation between surface hardening (Option B) vs module enlargement (Option C).
12. **Engineering Synthesis & Reflection:** Defend your final engineering modification considering casing envelope, centre distance, heat treatment feasibility of $55\text{C}8$ steel, and conveyor operational reliability.

## Key Formulas & Relations
- Transmission Ratio: $i = \frac{N_1}{N_2} = \frac{z_2}{z_1}$
- Rated Pinion Torque: $T_1 = \frac{60 \times 10^6 \times P}{2\pi N_1} \text{ [N}\cdot\text{mm]}$
- Pitch Circle Diameter: $d = m \cdot z \text{ [mm]}$
- Standard Centre Distance: $a = \frac{d_1 + d_2}{2} \text{ [mm]}$
- Lewis Form Factor ($20^\circ$ full depth involute): $Y = 0.484 - \frac{2.87}{z}$
- Pitch-Line Velocity: $v = \frac{\pi d_1 N_1}{60 \times 10^3} \text{ [m/s]}$
- Barth Velocity Factor: $C_v = \frac{5.6}{5.6 + \sqrt{v}}$
- Tangential Load: $P_t = \frac{2 T_1}{d_1} \text{ [N]}$
- Effective Dynamic Load: $P_{\text{eff}} = \frac{K_a K_m P_t}{C_v} \text{ [N]}$
- Lewis Beam Strength: $S_b = m \cdot b \cdot \sigma_b \cdot Y \text{ [N]}$
- Buckingham Wear Strength: $S_w = b \cdot Q \cdot d_1 \cdot K \text{ [N]}$, where $Q = \frac{2 z_2}{z_1 + z_2}$ and $K = 0.16\left(\frac{\text{BHN}}{100}\right)^2$
