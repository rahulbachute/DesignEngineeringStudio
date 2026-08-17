# Student Guide: Stress Concentration Analysis of a Plate with a Central Hole (EA-06)

## Overview
Welcome to **Engineering Challenge EA-06**. In this challenge, you assume the role of a **Mechanical Design Engineer** in the Design Verification Department. You are tasked with analyzing the stress distribution and safety factor of a flat steel plate with a central circular hole subjected to axial tension.

---

## Pedagogical Objectives
By completing this challenge, you will be able to:
1. **Identify** critical geometric parameters ($W, t, d$) and loading conditions.
2. **Formulate** valid engineering assumptions regarding stress distribution and material behavior.
3. **Calculate** net section area ($A_{\text{net}}$) and nominal tensile stress ($\sigma_{\text{nominal}}$).
4. **Determine** the theoretical stress concentration factor ($K_t$) based on the $d/W$ ratio.
5. **Evaluate** localized peak stress ($\sigma_{\text{max}} = K_t \cdot \sigma_{\text{nominal}}$) and factor of safety ($\text{FOS}$).
6. **Propose** geometric or material modifications to lower stress concentration and ensure structural integrity.

---

## Problem Parameters
- **Plate Width ($W$):** $100\text{ mm}$
- **Hole Diameter ($d$):** $20\text{ mm}$
- **Plate Thickness ($t$):** $10\text{ mm}$
- **Applied Tensile Load ($P$):** $40\text{ kN} = 40,000\text{ N}$
- **Material:** Mild Steel ($S_{yt} = 250\text{ MPa}$)
- **Target Factor of Safety:** $\text{FOS} \ge 2.0$

---

## 12 Engineering Activities Guide

### Activity 1: Project Charter
Read the client scenario, project deliverables, and safety implications. Accept the charter to commence work.

### Activity 2: Engineering Context
Understand real-world applications of plates with holes and historical engineering failure cases (e.g., De Havilland Comet square window stress raisers).

### Activity 3: Component Identification
Identify key features on the engineering asset diagram (Plate, Hole, Width, Thickness, Load, Net Section).

### Activity 4: Engineering Assumptions
Record assumptions regarding isotropic material behavior, uniform static loading, and elastic stress distribution.

### Activity 5: Free Body Diagram
Identify external tensile load vectors, internal resisting forces, and section plane boundaries.

### Activity 6: Engineering Calculations
Calculate net width ($W_{\text{net}} = 80\text{ mm}$), net section area ($A_{\text{net}} = 800\text{ mm}^2$), and nominal stress ($\sigma_{\text{nominal}} = 50\text{ MPa}$).

### Activity 7: Stress Concentration
Calculate the $d/W$ ratio ($0.20$) and determine $K_t \approx 2.51$ using standard design curves/formulas.

### Activity 8: Maximum Stress
Calculate peak localized stress: $\sigma_{\text{max}} = K_t \cdot \sigma_{\text{nominal}} = 2.51 \times 50\text{ MPa} = 125.5\text{ MPa}$.

### Activity 9: Material Selection
Compare candidate materials (Mild Steel, EN8, Stainless Steel, Aluminium 6061-T6) based on yield strength and ductility.

### Activity 10: Factor of Safety
Evaluate $\text{FOS} = S_{yt} / \sigma_{\text{max}} = 250 / 125.5 = 1.99$. Assess whether this satisfies the $\text{FOS} \ge 2.0$ requirement.

### Activity 11: Engineering Decision
Recommend design modifications (e.g., increasing plate width, upgrading to EN8 steel, or adding relief holes) to reduce $K_t$ and improve FOS.

### Activity 12: Engineering Report
Synthesize your calculations, stress analysis, and recommendations into a comprehensive engineering report.
