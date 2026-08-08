# Student Guide: Design of Shaft for a Real-World Engineering Application (EA-07)

## Overview
Welcome to **Engineering Challenge EA-07**. In this challenge, you assume the role of a **Senior Mechanical Design Engineer** in the Industrial Transmission Systems Department. You are tasked with analyzing and verifying the safety of a transmission shaft subjected to combined bending and torsional loading.

---

## Pedagogical Objectives
By completing this challenge, you will be able to:
1. **Identify** key transmission shaft components ($A, B, F_R, T$, Pulley, Key, Coupling).
2. **Explain** the working principle and combined stress state induced by radial and torsional loads.
3. **Calculate** bearing reactions ($R_A, R_B$), maximum bending moment ($M$), and transmitted torque ($T$).
4. **Utilize** the **Shaft Design Calculator** to compute equivalent twisting moment ($T_e$) and minimum required shaft diameter ($d_{\text{req}}$) as per ASME design code.
5. **Select** standard stock shafting size ($d_{\text{std}}$) and check actual shear stress ($\tau_{\text{act}}$) and Factor of Safety ($\text{FOS}$).
6. **Formulate** justified design decisions (Safe/Unsafe) and recommend geometric or material enhancements.

---

## Problem Parameters
- **Transmitted Power ($P$):** $15\text{ kW} = 15,000\text{ W}$
- **Rotational Speed ($N$):** $720\text{ rpm}$
- **Transverse Radial Load ($F_R$):** $3000\text{ N}$ applied at middle of span
- **Bearing Span ($L$):** $500\text{ mm}$
- **Material:** Plain Carbon Steel 40C8 ($S_{yt} = 380\text{ MPa}, S_{ut} = 580\text{ MPa}$)
- **ASME Factors:** $K_b = 1.5, K_t = 1.0$
- **Keyway Allowance:** Sunk Keyway present ($25\%$ reduction in allowable shear stress)
- **Target Factor of Safety:** $\text{FOS} \ge 2.0$

---

## 10 Engineering Activities Walkthrough

### Activity 1: Project Charter
Read the client scenario, deliverables, and safety implications. Accept the charter to commence work.

### Activity 2: Engineering Context
Understand real-world applications of rotating power transmission shafts in machine tools, lathes, pumps, and industrial conveyors.

### Activity 3: Component Identification
Identify key elements on the engineering illustration (Shaft, Bearings, Pulley, Key, Coupling, Radial Load, Torque).

### Activity 4: Working Principle
Explain combined bending and torsional stresses. Confirm Maximum Shear Stress Theory (ASME Code) as the standard failure criterion.

### Activity 5: Design Requirements
Review operating parameters and material strength values.

### Activity 6: Engineering Assumptions
Document assumptions regarding isotropic material behavior, static loading, simple support conditions, and keyway stress concentration factors.

### Activity 7: Free Body Diagram & Load Analysis
Calculate bearing reactions ($R_A = R_B = 1500\text{ N}$), maximum bending moment ($M = 375,000\text{ N}\cdot\text{mm}$), and transmitted torque ($T = 198,944\text{ N}\cdot\text{mm}$).

### Activity 8: Shaft Design Calculation
Use the ASME code formulas or launch the **Shaft Design Calculator**:
- $T_e = \sqrt{(K_b \cdot M)^2 + (K_t \cdot T)^2} = \sqrt{(1.5 \times 375000)^2 + (1.0 \times 198944)^2} = 596,447\text{ N}\cdot\text{mm}$
- $\tau_{\text{allowable}} = 0.75 \times \min(0.30 S_{yt}, 0.18 S_{ut}) = 0.75 \times 104.4 = 78.3\text{ MPa}$
- $d_{\text{req}} = \sqrt[3]{\frac{16 T_e}{\pi \tau_{\text{allowable}}}} = 33.86\text{ mm}$
- Selected standard diameter: $d_{\text{std}} = 40\text{ mm}$

### Activity 9: Material, Safety & Engineering Decision
Evaluate actual shear stress $\tau_{\text{act}} = \frac{16 T_e}{\pi d^3} = 47.46\text{ MPa}$ and FOS ($\text{FOS} = 78.3 / 47.46 = 1.65$ relative to allowable, or yield FOS $\text{FOS}_{\text{yield}} = 0.577 S_{yt} / 47.46 = 4.62$). Render a justified **SAFE** decision.

### Activity 10: Design Recommendation & Technical Report
Synthesize geometric recommendations (fillet radii, keyway tolerances) and final conclusions into a complete technical report.
