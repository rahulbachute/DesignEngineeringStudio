# EA-TS-04 Student Guide: Analysis of Spur Gears in a Car Transmission System

## Course & Assignment Context
- **Course:** PCC353-MEC — Transmission System Design (SPPU 2024 Course Pattern)
- **Unit:** Unit I — Spur and Helical Gears
- **Course Outcome:** CO1: Apply principle of Spur & Helical gear design for industrial application.
- **Assignment ID:** EA-TS-04
- **Slug:** `automotive-spur-gear-analysis`
- **Assignment Type:** Automotive Engineering Analysis & Design Verification
- **Total CCE Weightage:** 12.0 Marks (9.0 Automated Assessment + 3.0 Faculty Evaluation)
- **Estimated Duration:** 75–90 minutes
- **Difficulty:** Advanced

---

## 1. Engineering Scenario & Role
You are acting as a **Mechanical Transmission Design Engineer** investigating the reverse gear drive of a passenger-car manual gearbox. 

The reverse gear train employs straight external spur gears arranged in a three-gear train:
$$\text{Engine} \to \text{Clutch} \to \text{Input Shaft} \to \text{Reverse Driving Pinion } (z_1) \to \text{Reverse Idler Gear } (z_{\text{idler}}) \to \text{Reverse Driven Gear } (z_2) \to \text{Output Shaft}$$

The intermediate reverse idler gear reverses the direction of shaft rotation so that the vehicle moves backward, but it does **not** alter the kinematic transmission ratio ($i = N_1 / N_2 = z_2 / z_1 = 3.00$).

### Central Engineering Question
> **"Can the selected spur-gear pair safely transmit the required power and torque without bending or wear failure, and what engineering modification should be recommended if a criterion is not satisfied?"**

---

## 2. SPPU Syllabus Boundary Notice
> [!NOTE]
> The SPPU PCC353-MEC syllabus explicitly states: **"No numerical on force analysis of helical"**.
> 
> Therefore, in EA-TS-04:
> - This assignment is strictly a **spur gear numerical analysis** problem.
> - Zero numerical helical forces ($F_{a,\text{helical}}, F_{r,\text{helical}}, F_{t,\text{helical}}$) are required.
> - AGMA numerical design, shaft design, and bearing life calculations are excluded.

---

## 3. Workflow & Activity Breakdown (11 Activities + Submission)

| Activity | Title | Component | Marks | Assessment | Bloom Level |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | Engineering Problem Charter & Technical Scope | Information Card | 0.5 | Automated | L1 Understand |
| **2** | Automotive Gearbox Visualisation & Power Flow | Image Label | 0.0 | Visual | L2 Understand |
| **3** | Transmission Kinematics & Gear Dimensions | Calculation Inputs | 1.0 | Automated | L3 Apply |
| **4** | Spur Gear Force Analysis | Calculation Inputs | 1.0 | Automated | L3 Apply |
| **5** | Dynamic Tooth Loading & Velocity Factor | Calculation Inputs | 1.0 | Automated | L4 Analyse |
| **6** | Lewis Beam Strength & Bending Safety Factor | Calculation Inputs | 2.0 | Automated | L4 Analyse |
| **7** | Buckingham Wear Strength & Wear Safety Factor | Calculation Inputs | 1.5 | Automated | L4 Analyse |
| **8** | Automotive Failure Diagnosis & Governing Criterion | Text MCQ | 1.0 | Automated | L4 Analyse |
| **9** | Gear Adequacy Assessment & Engineering Decision | Text MCQ | 1.0 | Automated | L5 Evaluate |
| **10** | Engineering Recommendation & Redesign Defense | Calculation Inputs | 1.5 | Faculty | L5 Evaluate |
| **11** | Professional Synthesis & Design Reflection | Reflection | 1.5 | Faculty | L6 Create |
| **12** | Submission & Verification | Submission Summary | 0.0 | — | Submission |
| **—** | **TOTAL** | | **12.0** | | |

---

## 4. Frozen Numerical Dataset

| Parameter | Symbol | Value | Unit | Description |
| :--- | :---: | :---: | :---: | :--- |
| Delivered Power | $P$ | 8.0 | kW | Rated power delivered at input pinion |
| Input Pinion Speed | $N_1$ | 1200 | rpm | High-speed input shaft speed |
| Output Gear Speed | $N_2$ | 400 | rpm | Reverse output shaft speed |
| Transmission Ratio | $i$ | 3.00 | — | Kinematic reduction ratio ($1200 / 400$) |
| Number of Pinion Teeth | $z_1$ | 20 | — | Straight spur pinion teeth |
| Number of Gear Teeth | $z_2$ | 60 | — | Straight spur gear teeth |
| Standard Module | $m$ | 3.0 | mm | Metric standard module |
| Face Width | $b$ | 50.0 | mm | Active face width |
| Pressure Angle | $\phi$ | 20.0 | deg | Full-depth involute pressure angle |
| Service Factor | $C_s$ | 1.50 | — | Automotive shock duty factor |
| Load Concentration Factor | $K_m$ | 1.25 | — | Mounting deflection / distribution factor |
| Target Factor of Safety | $[\text{FOS}]$ | 1.50 | — | Operational safety benchmark |
| Pinion Tensile Strength | $S_{ut1}$ | 700 | MPa | Pinion alloy steel core strength |
| Gear Tensile Strength | $S_{ut2}$ | 600 | MPa | Gear carbon steel core strength |
| Pinion Surface Hardness | $\text{BHN}_1$ | 350 | BHN | Through-hardened / heat-treated flank |
| Gear Surface Hardness | $\text{BHN}_2$ | 350 | BHN | Through-hardened / heat-treated flank |

---

## 5. Authoritative Calculation Methodology & Checkpoints

### Step 1: Kinematics & Pitch Geometry
1. **Input Pinion Torque:**
   $$T_1 = \frac{9550 \times P}{N_1} \times 10^3 = \frac{9550 \times 8.0}{1200} \times 10^3 = 63,661.98\text{ N}\cdot\text{mm}$$
2. **Pitch Circle Diameters:**
   $$d_1 = m \times z_1 = 3 \times 20 = 60.00\text{ mm}$$
   $$d_2 = m \times z_2 = 3 \times 60 = 180.00\text{ mm}$$
3. **Shaft Centre Distance:**
   $$a = \frac{d_1 + d_2}{2} = \frac{60 + 180}{2} = 120.00\text{ mm}$$

### Step 2: Force Analysis ($\phi = 20^\circ$)
1. **Tangential Force:**
   $$P_t = \frac{2 T_1}{d_1} = \frac{2 \times 63661.98}{60} = 2,122.07\text{ N}$$
2. **Radial Force:**
   $$P_r = P_t \tan\phi = 2122.07 \times \tan(20^\circ) = 772.37\text{ N}$$

### Step 3: Dynamic Tooth Loading
1. **Pitch-Line Velocity:**
   $$v = \frac{\pi d_1 N_1}{60 \times 10^3} = \frac{\pi \times 60 \times 1200}{60000} = 3.770\text{ m/s}$$
2. **Barth Velocity Factor:**
   $$C_v = \frac{6}{6 + v} = \frac{6}{6 + 3.770} = 0.6141$$
3. **Effective Dynamic Tooth Load:**
   $$P_{\text{eff}} = \frac{C_s \times K_m \times P_t}{C_v} = \frac{1.50 \times 1.25 \times 2122.07}{0.6141} = 6,478.87\text{ N}$$

### Step 4: Lewis Beam Strength & Bending Safety Factor
1. **Permissible Bending Stresses:**
   $$\sigma_{b1} = \frac{S_{ut1}}{3} = \frac{700}{3} = 233.33\text{ MPa}, \quad \sigma_{b2} = \frac{S_{ut2}}{3} = \frac{600}{3} = 200.00\text{ MPa}$$
2. **Authoritative Lewis Form Factors:**
   $$Y_1 = 0.320 \quad (\text{Pinion}, z_1 = 20), \quad Y_2 = 0.421 \quad (\text{Gear}, z_2 = 60)$$
3. **Weaker Member Determination:**
   $$\text{Pinion Strength Index} = \sigma_{b1} Y_1 = 233.33 \times 0.320 = 74.67\text{ MPa}$$
   $$\text{Gear Strength Index} = \sigma_{b2} Y_2 = 200.00 \times 0.421 = 84.20\text{ MPa}$$
   $$\text{Since } 74.67 < 84.20 \implies \mathbf{Pinion\ is\ the\ weaker\ member.}$$
4. **Lewis Beam Strength:**
   $$S_{b1} = m \times b \times \sigma_{b1} \times Y_1 = 3 \times 50 \times 233.333 \times 0.320 = 11,200.00\text{ N}$$
   $$S_{b2} = m \times b \times \sigma_{b2} \times Y_2 = 3 \times 50 \times 200.000 \times 0.421 = 12,630.00\text{ N}$$
5. **Bending Factor of Safety:**
   $$\text{FOS}_b = \frac{S_{b1}}{P_{\text{eff}}} = \frac{11200}{6478.87} = 1.729 \ge 1.50 \implies \mathbf{SAFE}$$

### Step 5: Buckingham Wear Strength & Wear Safety Factor
1. **Ratio Factor ($Q$):**
   $$Q = \frac{2 z_2}{z_1 + z_2} = \frac{2 \times 60}{20 + 60} = 1.50$$
2. **Load-Stress Factor ($K$ for $350\text{ BHN}$):**
   $$K = 0.16 \left(\frac{\text{BHN}}{100}\right)^2 = 0.16 \times (3.5)^2 = 1.96\text{ N/mm}^2$$
3. **Buckingham Wear Strength ($S_w$):**
   $$S_w = b \times Q \times d_1 \times K = 50 \times 1.50 \times 60 \times 1.96 = 8,820.00\text{ N}$$
4. **Wear Factor of Safety:**
   $$\text{FOS}_w = \frac{S_w}{P_{\text{eff}}} = \frac{8820}{6478.87} = 1.361 < 1.50 \implies \mathbf{NOT\ SAFE}$$

---

## 6. Authoritative Checkpoint Summary Table

| Parameter | Expected Checkpoint Value | Status |
| :--- | :---: | :---: |
| Rated Pinion Torque ($T_1$) | 63,661.98 N·mm | Authoritative |
| Pinion Pitch Diameter ($d_1$) | 60.00 mm | Authoritative |
| Gear Pitch Diameter ($d_2$) | 180.00 mm | Authoritative |
| Shaft Centre Distance ($a$) | 120.00 mm | Authoritative |
| Pitch-Line Velocity ($v$) | 3.770 m/s | Authoritative |
| Tangential Force ($P_t$) | 2,122.07 N | Authoritative |
| Radial Force ($P_r$) | 772.37 N | Authoritative |
| Barth Velocity Factor ($C_v$) | 0.6141 | Authoritative |
| Effective Dynamic Load ($P_{\text{eff}}$) | 6,478.87 N | Authoritative |
| Lewis Form Factor Pinion ($Y_1$) | 0.320 | Authoritative |
| Lewis Form Factor Gear ($Y_2$) | 0.421 | Authoritative |
| Pinion Beam Strength ($S_{b1}$) | 11,200.00 N | Authoritative |
| Gear Beam Strength ($S_{b2}$) | 12,630.00 N | Authoritative |
| Weaker Member | Pinion | Authoritative |
| Bending Safety Factor ($\text{FOS}_b$) | 1.729 (SAFE) | Authoritative |
| Buckingham Ratio Factor ($Q$) | 1.50 | Authoritative |
| Load-Stress Factor ($K$) | 1.96 N/mm² | Authoritative |
| Buckingham Wear Strength ($S_w$) | 8,820.00 N | Authoritative |
| Wear Safety Factor ($\text{FOS}_w$) | 1.361 (NOT SAFE) | Authoritative |
| Governing Failure Criterion | Wear / Pitting Fatigue | Authoritative |
| Initial Gear Adequacy | **NOT ADEQUATE** | Authoritative |

---

## 7. Engineering Failure Diagnosis & Recommendation
- **Diagnosis:** Tooth root bending strength is safe ($\text{FOS}_b = 1.729 \ge 1.50$), but flank surface durability fails the target ($\text{FOS}_w = 1.361 < 1.50$). Hence, **surface wear / pitting fatigue governs**.
- **Adequacy Decision:** The initial design is **NOT ADEQUATE** for automotive production release.
- **Redesign Verification Pathway:** Increasing surface hardness to **400 BHN**:
  $$K_{\text{new}} = 0.16 \times (4.0)^2 = 2.56\text{ N/mm}^2$$
  $$S_{w,\text{new}} = 50 \times 1.50 \times 60 \times 2.56 = 11,520.00\text{ N}$$
  $$\text{FOS}_{w,\text{new}} = \frac{11520}{6478.87} = 1.778 \ge 1.50 \implies \mathbf{SAFE}$$
  *Key packaging advantage:* This completely preserves the transmission casing envelope and centre distance ($a = 120\text{ mm}$).
