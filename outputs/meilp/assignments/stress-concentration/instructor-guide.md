# Faculty Guide: Stress Concentration Analysis of a Plate with a Central Hole (EA-06)

## Educational Context
- **Course:** PCC303-MEC Design of Machine Elements (SPPU 2024 Pattern, Unit-I)
- **Course Outcome (CO1):** Design components subjected to stress concentration by selecting appropriate materials and geometric modifications.
- **Bloom's Levels:** L1 (Understand) to L5 (Evaluate)
- **Total Marks:** 12 CCE Marks

---

## Benchmark Solutions & Answer Key

### 1. Net Area & Nominal Stress
- **Net Width ($W_{\text{net}}$):** $W - d = 100 - 20 = 80\text{ mm}$
- **Net Area ($A_{\text{net}}$):** $(W - d) \times t = 80 \times 10 = 800\text{ mm}^2$
- **Nominal Stress ($\sigma_{\text{nominal}}$):** $P / A_{\text{net}} = 40,000 / 800 = 50.0\text{ MPa}$

### 2. Stress Concentration & Peak Stress
- **ratio ($d/W$):** $20 / 100 = 0.20$
- **Theoretical $K_t$:** For $d/W = 0.20$, $K_t \approx 2.51$
- **Maximum Localized Stress ($\sigma_{\text{max}}$):** $K_t \times \sigma_{\text{nominal}} = 2.51 \times 50 = 125.5\text{ MPa}$

### 3. Safety Factor & Material Decision
- **Mild Steel ($S_{yt} = 250\text{ MPa}$):** $\text{FOS} = 250 / 125.5 = 1.99$ (Marginally below 2.0 target)
- **EN8 Medium Carbon Steel ($S_{yt} = 465\text{ MPa}$):** $\text{FOS} = 465 / 125.5 = 3.70$ (Safe)

---

## Evaluation Guidance
1. **Component & FBD Identification (2 Marks Total):** Verify correct matching of plate dimensions and load vectors.
2. **Calculations (6.5 Marks Total):**
   - Net Area & Nominal Stress: 2 Marks
   - $d/W$ ratio & $K_t$: 2 Marks
   - Maximum Stress: 1.5 Marks
   - FOS Calculation: 1 Mark
3. **Engineering Judgement & Decision (3.5 Marks Total):** Check whether the student correctly identifies the marginal safety of Mild Steel under dynamic load and provides logical geometric (e.g., increasing width or adding relief holes) or material upgrades.
