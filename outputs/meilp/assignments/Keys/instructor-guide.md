# Instructor Guide — Assignment 08 (EC-08 / EA-08)
## Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission

### Academic Overview
- **Course**: PCC303-MEC – Design of Machine Elements (SPPU 2024 Pattern, Unit II)
- **Assignment Code**: EC-08 / EA-08
- **Total CCE Marks**: 12 Marks
- **Target Course Outcome**: CO2 (Design power transmission shafts, keys, and couplings subjected to combined loading)

---

### Benchmark Solution & Verification Data

#### Operating Parameters
- $P = 22\text{ kW} = 22,000\text{ W}$
- $N = 1440\text{ rpm}$
- $d = 40\text{ mm}$
- Material C45 ($S_{yt} = 360\text{ MPa}$, $S_{ut} = 600\text{ MPa}$)
- Key Size: $b = 10\text{ mm}$, $h = 10\text{ mm}$, $l = 45\text{ mm}$

#### Quantitative Benchmarks
1. **Transmitted Torque ($T$)**:
   $$T = \frac{60 \times 10^6 \times 22}{2 \pi \times 1440} = 145,887.35\text{ N}\cdot\text{mm}$$
2. **Tangential Driving Force ($F_t$)**:
   $$F_t = \frac{2T}{d} = \frac{2 \times 145887.35}{40} = 7,294.37\text{ N}$$
3. **Allowable Shear Stress ($\tau_{\text{allow}}$ for FOS=2.5)**:
   $$\tau_{\text{allow}} = \frac{0.5 \times S_{yt}}{2.5} = \frac{180}{2.5} = 72\text{ MPa}$$
4. **Allowable Crushing Stress ($\sigma_{c,\text{allow}}$ for FOS=2.5)**:
   $$\sigma_{c,\text{allow}} = \frac{S_{yt}}{2.5} = \frac{360}{2.5} = 144\text{ MPa}$$
5. **Minimum Required Key Length ($l_{\text{req}}$)**:
   $$l_{\text{shear}} = \frac{2T}{d \cdot b \cdot \tau_{\text{allow}}} = \frac{291774.7}{40 \times 10 \times 72} = 10.13\text{ mm}$$
   $$l_{\text{crush}} = \frac{4T}{d \cdot h \cdot \sigma_{c,\text{allow}}} = \frac{583549.4}{40 \times 10 \times 144} = 10.13\text{ mm}$$
6. **Actual Shear Stress for Installed $l = 45\text{ mm}$**:
   $$\tau_{\text{act}} = \frac{2T}{d \cdot b \cdot l} = \frac{291774.7}{40 \times 10 \times 45} = 16.21\text{ MPa}$$
7. **Actual Crushing Stress for Installed $l = 45\text{ mm}$**:
   $$\sigma_{c,\text{act}} = \frac{4T}{d \cdot h \cdot l} = \frac{583549.4}{40 \times 10 \times 45} = 32.42\text{ MPa}$$
8. **Factor of Safety (FOS)**:
   $$\text{FOS}_{\text{shear}} = \frac{180}{16.21} = 11.10$$
   $$\text{FOS}_{\text{crushing}} = \frac{360}{32.42} = 11.10$$

---

### Evaluation Criteria
- **Activity 3 (1 Mark)**: Correct dropdown selection of 8 components on EA-08.
- **Activity 4 (1 Mark)**: Explanation of force path and MCQ selection ($\sigma_c / \tau = 2.0$).
- **Activity 5 (1 Mark)**: Identification of design inputs.
- **Activity 6 (0.5 Mark)**: Engineering assumptions log.
- **Activity 7 (3 Marks)**: Accurate calculation of $T, F_t$, and $l_{\text{req}}$.
- **Activity 8 (2.5 Marks)**: Actual stress and FOS calculation.
- **Activity 9 (1.5 Marks)**: Evidence-based SAFE decision and technical justification.
- **Activity 10 (1.5 Marks)**: Engineering synthesis and reflection responses.
