# EA-TS-01 Student Guide: Design of Helical Gears for High-Speed Rotary Equipment

## Course Information
- **Course:** PCC353-MEC — Transmission System Design
- **Unit:** Unit I — Spur and Helical Gears
- **Course Outcome:** CO1: Apply principle of Spur & Helical gear design for industrial application.
- **Assignment ID:** EA-TS-01
- **CCE Total Marks:** 12.0 Marks (9.0 Automated Calculations + 3.0 Faculty Judgement & Synthesis)

## Engineering Scenario
You are a Mechanical Transmission Design Engineer in the Industrial Turbomachinery & Rotary Drive Division. You have been tasked with designing, verifying, and optimizing a single-stage helical gearbox transmitting 15.0 kW from an electric motor operating at 1440 rpm to a centrifugal compressor running at 480 rpm (transmission ratio i = 3.0).

## Learning Journey (MEILP Framework)
1. **Engineering Problem Charter:** Review client brief, operating conditions, and safety criteria ([FOS] >= 1.50).
2. **Engineering Visualisation:** Inspect the helical gear drive schematic and identify 10 key transmission elements.
3. **Gear Geometry & Transmission Parameters:** Compute rated torque, transmission ratio, formative virtual teeth ($z' = z / \cos^3\psi$), Lewis form factors, pitch circle diameters ($d_1, d_2$), and centre distance ($a$).
4. **Material Selection & Gear-Tooth Failure:** Calculate permissible bending stresses ($\sigma_b = S_{ut}/3$) and strength products to deterministically identify the weaker element in bending (Gear: 55C8 plain carbon steel).
5. **Helical Force Understanding & Dynamic Load:** Calculate pitch-line velocity ($v$), Barth dynamic velocity factor ($C_v$), transverse tangential force ($P_t$), and effective dynamic tooth load ($P_{\text{eff}}$).
6. **Strength Calculation & Diagnosis:** Calculate Lewis beam strength ($S_b$), Buckingham wear strength ($S_w$), actual safety factors ($\text{FOS}_b, \text{FOS}_w$), and diagnose the governing surface pitting defect ($\text{FOS}_w = 0.86 < 1.50$).
7. **Engineering Redesign Analysis:** Quantitatively evaluate:
   - Option A: Increase face width to $b = 55\text{ mm}$ ($\text{FOS}_w = 1.19$ — Insufficient).
   - Option B1: Increase gear tooth surface hardness to $350\text{ BHN}$ ($\text{FOS}_w = 1.69$ — Satisfies Target).
   - Option C: Increase normal module to $m_n = 5\text{ mm}, b = 50\text{ mm}$ ($\text{FOS}_w = 1.63$ — Satisfies Target).
8. **Engineering Synthesis & Reflection:** Defend your final engineering modification considering casing size, manufacturing feasibility of 55C8 steel, and operational reliability.

## Key Formulas & Relations
- Rated Torque: $T_1 = \frac{60 \times 10^6 \times P}{2\pi N_1} \text{ [N}\cdot\text{mm]}$
- Formative Virtual Teeth: $z' = \frac{z}{\cos^3\psi}$
- Lewis Form Factor: $Y_v = 0.484 - \frac{2.87}{z'}$
- Pitch Diameter: $d = \frac{z \cdot m_n}{\cos\psi}$
- Centre Distance: $a = \frac{d_1 + d_2}{2}$
- Pitch-Line Velocity: $v = \frac{\pi d_1 N_1}{60 \times 10^3} \text{ [m/s]}$
- Barth Velocity Factor: $C_v = \frac{5.6}{5.6 + \sqrt{v}}$
- Effective Load: $P_{\text{eff}} = \frac{K_a K_m P_t}{C_v}$
- Lewis Beam Strength: $S_b = m_n \cdot b \cdot \sigma_b \cdot Y_v$
- Buckingham Wear Strength: $S_w = \frac{b Q d_1 K}{\cos^2\psi}$, where $Q = \frac{2z_2}{z_1 + z_2}$ and $K = 0.16\left(\frac{\text{BHN}}{100}\right)^2$
