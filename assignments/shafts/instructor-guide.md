# Faculty Guide: Design of Shaft for a Real-World Engineering Application (EA-07)

## Educational Context
- **Course:** PCC303-MEC Design of Machine Elements (SPPU 2024 Pattern, Unit-II)
- **Course Outcome (CO2):** Design power transmission shafts, keys, and couplings subjected to combined bending and torsional loads by applying strength, rigidity, and safety criteria.
- **Bloom's Levels:** L1 (Understand) to L5 (Evaluate)
- **Total Marks:** 12 CCE Marks

---

## Benchmark Solutions & Answer Key

### 1. Load & Reaction Analysis (Activity 7)
- **Bearing Reactions ($R_A = R_B$):** $F_R / 2 = 3000 / 2 = 1500\text{ N}$
- **Maximum Bending Moment ($M$):** $(F_R \times L) / 4 = (3000 \times 500) / 4 = 375,000\text{ N}\cdot\text{mm}$
- **Transmitted Torque ($T$):** $(60 \times 10^6 \times P) / (2 \pi N) = (60 \times 10^6 \times 15) / (2 \pi \times 720) = 198,944\text{ N}\cdot\text{mm}$

### 2. Shaft Design Calculation (Activity 8)
- **Equivalent Twisting Moment ($T_e$):** $\sqrt{(1.5 \times 375,000)^2 + (1.0 \times 198,944)^2} = 596,447\text{ N}\cdot\text{mm}$
- **ASME Allowable Shear Stress ($\tau_{\text{allowable}}$):** $0.75 \times \min(0.30 \times 380, 0.18 \times 580) = 0.75 \times \min(114, 104.4) = 78.3\text{ MPa}$
- **Required Minimum Shaft Diameter ($d_{\text{req}}$):** $\sqrt[3]{\frac{16 \times 596,447}{\pi \times 78.3}} = 33.86\text{ mm}$
- **Selected Standard Stock Shaft Diameter ($d_{\text{std}}$):** $40\text{ mm}$

### 3. Material & Safety Verification (Activity 9)
- **Actual Max Shear Stress ($\tau_{\text{act}}$):** $\frac{16 \times 596,447}{\pi \times 40^3} = 47.46\text{ MPa}$
- **Allowable Basis FOS:** $78.3 / 47.46 = 1.65$
- **Yield Strength Basis FOS ($\text{FOS}_{\text{yield}}$):** $(0.577 \times 380) / 47.46 = 219.26 / 47.46 = 4.62$
- **Decision:** **SAFE DESIGN** ($d_{\text{std}} = 40\text{ mm} > d_{\text{req}} = 33.86\text{ mm}$).

---

## Evaluation Guidance
1. **Component Identification & Working Principle (2 Marks Total):** Verify correct matching of shaft components and recognition of Guest's / ASME maximum shear stress theory.
2. **Calculations (6 Marks Total):**
   - Reactions, Bending Moment, Torque: 2 Marks
   - Equivalent Twisting Moment & Required Diameter: 3 Marks
   - Input accuracy in Shaft Design Calculator: 1 Mark
3. **Engineering Judgement & Decision (4 Marks Total):**
   - Material & Safety Verification: 2 Marks
   - Design Recommendations & Report: 2 Marks
