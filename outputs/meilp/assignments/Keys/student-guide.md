# Student Guide — Assignment 08 (EC-08 / EA-08)
## Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission

### Overview
Welcome to **Assignment 08: Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission**!

In this challenge, you serve as a **Senior Mechanical Design Engineer** evaluating a heavy-duty industrial centrifugal pump drive assembly at Kirloskar Pump Systems, Pune.

---

### Operating Scenario
- **Power Transmitted (P)**: 22 kW (22,000 W)
- **Shaft Speed (N)**: 1440 rpm
- **Shaft Diameter (d)**: 40 mm
- **Key Material**: Plain Carbon Steel C45 ($S_{yt} = 360\text{ MPa}$, $S_{ut} = 600\text{ MPa}$)
- **Installed Key Size**: Square parallel key ($b = 10\text{ mm}$, $h = 10\text{ mm}$, $l = 45\text{ mm}$)
- **Target Factor of Safety**: $\text{FOS}_{\text{target}} \ge 2.5$

---

### Step-by-Step Activity Walkthrough

#### Activity 1: Project Charter
Understand the industrial problem, role, safety responsibility, and deliverables. Accept the charter to unlock the workbench.

#### Activity 2: Engineering Context
Study the shaft-hub-key connection mechanics and view Engineering Asset **EA-08**.

#### Activity 3: Component Identification
Identify the 8 key elements on Engineering Asset **EA-08** using the dropdown selection table.

#### Activity 4: Working Principle
Understand how torque $T$ produces tangential driving force $F_t$ at the shaft surface ($r = d/2$), creating direct shear and crushing stresses. Answer the concept verification question.

#### Activity 5: Design Requirements
Record given operational parameters ($P, N, d, l$).

#### Activity 6: Engineering Assumptions
Formulate engineering assumptions regarding uniform force distribution, fit tolerances, and material limits.

#### Activity 7: Key Design Calculation
Calculate:
1. Transmitted Torque: $T = \frac{60 \times 10^6 \times P}{2 \pi N} = 145,887\text{ N}\cdot\text{mm}$
2. Tangential Force: $F_t = \frac{2T}{d} = 7,294\text{ N}$
3. Minimum required length $l_{\text{req}}$ for $\text{FOS} = 2.5$.

#### Activity 8: Failure Analysis & Safety Verification
Compute actual stresses for the installed key ($l = 45\text{ mm}$):
1. Actual Shear Stress: $\tau_{\text{act}} = \frac{2T}{d \cdot b \cdot l} = 16.21\text{ MPa}$
2. Actual Crushing Stress: $\sigma_{c,\text{act}} = \frac{4T}{d \cdot h \cdot l} = 32.42\text{ MPa}$
3. Factor of Safety: $\text{FOS} = 11.1$ (relative to yield strength limits).

#### Activity 9: Engineering Decision & Design Improvement
Formulate your evidence-based **SAFE** decision and suggest keyway fillet/chamfer improvements.

#### Activity 10: Technical Report & Submission
Synthesize your engineering report, answer the reflection questions, and submit your final challenge package.
