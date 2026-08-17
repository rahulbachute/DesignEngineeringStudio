# Instructor Guide — Assignment 09 (EC-09 / EA-09)
## Identification and Selection of Couplings Used in Mechanical Power Transmission

### Academic Overview
- **Course**: PCC303-MEC – Design of Machine Elements (SPPU 2024 Pattern, Semester V, Unit I)
- **Assignment Code**: EC-09 / EA-09
- **Total CCE Marks**: 12 Marks
- **Target Course Outcome**: CO2 (Design power transmission shafts, keys, and couplings subjected to combined loading by applying strength, rigidity, and safety criteria)
- **Target Program Outcomes**: PO1 (Engineering Knowledge), PO2 (Problem Analysis), PO3 (Design/Development of Solutions), PO4 (Conduct Investigations), PO5 (Modern Tool Usage), PO7 (Environment & Sustainability), PO8 (Ethics), PO9 (Individual & Team Work), PO11 (Project Management)
- **Target PSOs**: PSO1 (Mechanical Systems Design), PSO2 (Industrial Application & Judgement)

---

### Benchmark Solution & Verification Data

#### Operating System Parameters
- **Prime Mover**: 3-Phase Electric Motor ($P = 22\text{ kW} = 22,000\text{ W}$, $N = 1440\text{ rpm}$)
- **Driven Equipment**: Industrial Centrifugal Water Pump
- **Shaft Diameter**: $d = 40\text{ mm}$
- **Service Factor**: $K_l = 1.5$ (Continuous industrial fluid pumping with minor torque fluctuations)

#### Quantitative Benchmarks
1. **Transmitted Nominal Torque ($T$)**:
   $$T = \frac{60 \times 10^6 \times P}{2 \pi N} = \frac{60 \times 10^6 \times 22}{2 \pi \times 1440} = 145,892.2\text{ N}\cdot\text{mm} = 145.89\text{ N}\cdot\text{m}$$

2. **Design Torque ($T_d$)**:
   $$T_d = K_l \times T = 1.5 \times 145,892.2 = 218,838.3\text{ N}\cdot\text{mm} = 218.84\text{ N}\cdot\text{m}$$

#### Recommended Coupling Selection
- **Selected Coupling**: **Bushed-Pin Flexible Coupling** (or Elastomeric Jaw/Spider Coupling)
- **Primary Reasons**:
  1. Safely transmits design torque $T_d = 218.83\text{ N-m}$.
  2. Accommodates inevitable operational shaft misalignments (parallel offset up to 0.5 mm, angular offset up to 0.5°).
  3. Rubber bushes absorb fluid dynamic shock loads and dampen torsional vibration, protecting motor and pump bearings.
  4. Maintenance convenience: Worn rubber bushes can be replaced without axially shifting the heavy motor or pump castings.

#### Alternative Coupling Evaluation
- **Alternative Evaluated**: **Rigid Flange Coupling**
- **Rejection Reason**: Rigid Flange requires perfect coaxial alignment. Under real operating conditions (thermal expansion, foundation deflection), it induces high bending moments, excessive bearing reaction forces, fretting wear, and catastrophic bearing failure.

---

### Evaluation Criteria (12 CCE Marks)
- **Activity 3 (1.0 Mark)**: Accurate dropdown identification of 10 components on EA-09.
- **Activity 4 (1.0 Mark)**: Understanding of torque transmission mechanics and elastomeric damping MCQ.
- **Activity 5 (1.0 Mark)**: Correct classification of Rigid vs Flexible couplings.
- **Activity 6 (1.0 Mark)**: Application requirements matching for motor-pump, compressor, conveyor, and lathe drives.
- **Activity 7 (1.5 Marks)**: Comparative evaluation of coupling types across performance parameters.
- **Activity 8 (2.0 Marks)**: Accurate calculation of $T$ (145,887 N-mm) and $T_d$ (218,831 N-mm).
- **Activity 9 (1.0 Mark)**: Selection of Bushed-Pin Flexible Coupling.
- **Activity 10 (1.5 Marks)**: Multi-faceted engineering justification.
- **Activity 11 (1.0 Mark)**: Decision matrix and technical rejection of rigid alternative.
- **Activity 12 (1.0 Mark)**: Technical synthesis and reflection report.
