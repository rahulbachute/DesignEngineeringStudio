# Mechanical Engineering Interactive Learning Platform (MEILP)
## Student User Manual

Welcome to MEILP! This platform is designed to help you solve real-world engineering design problems interactively. This guide will walk you through everything you need to know to complete your assignments and submit your engineering calculations.

---

### 1. Accessing the Platform

1. **Open the Platform**: Navigate to the MEILP URL provided by your faculty.
2. **Dashboard Overview**: When you land on the homepage, you will see your available assignments (e.g., *Elevator Design Project*).
3. **Start an Assignment**: Click the **Start Assignment** or **Open Workbench** button on the assignment card to begin.

---

### 2. Assignment Workbench Layout

The Workbench is where you will spend most of your time. It is divided into two main panels:

* **Left Panel (Reference & Data):**
  * **Instructions:** Read the overarching problem statement and step-by-step goals.
  * **Given Data:** View the constraints and initial parameters given to you (e.g., Car weight, number of passengers).
  * **Rubric:** See exactly how you will be graded on this assignment.

* **Right Panel (Interactive Workspace):**
  * **Student Information:** Enter your identity details here first.
  * **Task Progression:** The actual tasks (like Engineering Notebooks, Diagrams, or Standard Selections) appear here. You must complete them sequentially.
  * **Action Buttons:** Use "Next", "Previous", and "Submit" at the bottom of the screen to navigate through the tasks.

---

### 3. Setting Up Your Identity

Before you can start working on the calculations, you must declare who is completing the assignment.

1. Locate the **Student Information** card at the top of the right panel.
2. Select your **Attempt Mode**:
   * **Individual**: Enter your Full Name and Roll Number.
   * **Group**: Enter your Group Number and the Names of all team members.
3. Select your **Division** from the dropdown list.
4. *Note: You cannot submit the assignment until this section is completely filled out.*

---

### 4. Completing Tasks (Detailed Walkthrough: Elevator Design Project)

Assignments are broken down into small, manageable tasks. Below is a highly detailed, step-by-step guide of exactly what you will see, what you should click, and **examples of exactly what you should write** for your first assignment: **Safety Verification of Elevator Suspension Cables (EC-01)**. 

*(Note: You can use these sample answers as a guide, but ensure your final submission reflects your own understanding.)*

#### Step 1: Understand the Project Charter
* **What you will see:** A series of information cards detailing the client (ABC Commercial Complex), project background, objectives, and safety standards (ASME A17.1 requires a minimum Factor of Safety of 10).
* **What you must do:** Read all the information carefully.
* **Action:** Scroll to the bottom and click the button labeled: **"I have read and accepted the EC-01 Project Charter"**.

#### Step 2: Identify Components (Interactive Diagrams)
* **What you will see:** An engineering drawing of a Traction Elevator System with numbered callouts (1 to 20).
* **What you must do:** Click on each number and select the correct component name from the dropdown list.
* **Sample Actions:**
  * For **Callout 1**: Select `"Electric Motor"`
  * For **Callout 2**: Select `"Drive Sheave"`
  * For **Callout 3**: Select `"Suspension Wire Ropes"`
  * For **Callout 4**: Select `"Elevator Car"`
  * For **Callout 6**: Select `"Counterweight"`

#### Step 3: Working Principle of Traction Elevator
* **What you will see:** A text box asking you to explain how the elevator works, and a Multiple Choice Question (MCQ).
* **What you must do:** Type a detailed explanation and select the correct MCQ answer.
* **Sample Text Answer:** 
  > *"The electric motor drives the traction sheave. The suspension ropes connect the elevator car and the counterweight and pass over this sheave. Friction between the ropes and the sheave moves the car along the guide rails. The controller manages the operation, and safety gears are installed to stop the car in emergencies."*
* **MCQ Question:** Which component directly provides traction to move the suspension ropes?
* **MCQ Answer:** Select **`Traction Sheave`**.

#### Step 4: Free Body Diagram Analysis
* **What you will see:** An interactive diagram focusing on the forces acting on the elevator.
* **What you must do:** Label the force vectors correctly.
* **Sample Actions:**
  * For the **Upward Arrow** (Callout 3): Select `"Tensile Force (Upwards)"`
  * For the **Downward Arrow** (Callout 4): Select `"Weight of Elevator Car (Downwards)"`

#### Step 5: Engineering Model
* **What you will see:** A text box asking for the load path, and an MCQ.
* **What you must do:** Explain how the passenger weight transfers to the ropes.
* **Sample Text Answer:** 
  > *"The passenger load acts on the elevator car floor. This load transfers to the rigid car frame, which then distributes the total downward force evenly to the suspension ropes as a tensile load."*
* **MCQ Question:** Which sequence correctly represents the static load path for the elevator car?
* **MCQ Answer:** Select **`Weight -> Load Distribution -> Tension in Rope`**.

#### Step 6: Design Requirements & Safety Standards
* **What you will see:** Input fields to enter the numerical constraints given in the project brief.
* **What you must do:** Type the exact numbers into the boxes.
* **Sample Data to Enter:** 
  * Maximum Passenger Load: Type **`10`**
  * Cabin Weight: Type **`700`**
  * Number of Ropes: Type **`4`**
  * Standard Required FoS: Type **`10`**

#### Step 7: Engineering Assumptions
* **What you will see:** Text boxes asking you to state your assumptions for the calculations.
* **What you must do:** Write clear, professional engineering assumptions.
* **Sample Answers:**
  * **Loading Type:** *"We assume the loading is purely static to simplify the calculation, ignoring dynamic acceleration and deceleration forces."*
  * **Load Distribution:** *"We assume the total combined load is distributed perfectly equally among all 4 suspension ropes."*
  * **Rope Weight:** *"The self-weight of the suspension ropes is considered negligible compared to the heavy cabin and passenger load."*

#### Step 8: Material Selection
* **What you will see:** A list of candidate materials (Mild Steel, High Carbon Steel, Stainless Steel, Synthetic Rope).
* **What you must do:** Select the most appropriate material.
* **Action:** Click on the card for **`High Carbon Steel (Syt = 800 MPa)`** because it offers the high tensile strength required for heavy-duty suspension applications.

#### Step 9: Engineering Calculations (The Engineering Notebook)
* **What you will see:** A structured calculation sheet. You must calculate the values using a calculator (assuming 75 kg per passenger and gravity $g = 9.81 \, m/s^2$) and type in the final numbers.
* **What you must do (Exact Sample Calculation Flow):**
  * **Passenger Mass (kg):** Type **`750`** *(Calculation: 10 pax × 75 kg)*
  * **Total Elevator Mass (kg):** Type **`1450`** *(Calculation: 750 kg + 700 kg cabin)*
  * **Total Load (N):** Type **`14224.5`** *(Calculation: 1450 kg × 9.81)*
  * **Load on One Rope (N):** Type **`3556.125`** *(Calculation: 14224.5 / 4 ropes)*
  * **Required Breaking Load (N):** Type **`35561.25`** *(Calculation: 3556.125 × 10 FoS)*
  * **Required Rope Diameter (mm):** Type **`8.43`** *(Calculation: using Pb = 500 d²)*
  * **Standard Rope Diameter (mm):** Type **`12`** *(Selection of the nearest higher standard size).*
  * **Actual Tensile Stress (MPa):** Type **`64.98`** *(Calculation: Load on One Rope / (0.38 × d²), where 0.38 d² is the effective metallic cross-sectional area as per Bhandari).*
  * **Actual Factor of Safety:** Type **`12.31`** *(Calculation: 800 MPa / Actual Stress).*

#### Step 10: Engineering Decision
* **What you will see:** A choice to approve or reject the design, and a text box for justification.
* **What you must do:** Make the final call and explain why.
* **Action:** Select **`SAFE: Approve Procurement`**.
* **Sample Justification Answer:** 
  > *"The selected standard diameter of 12 mm gives an actual Factor of Safety of 12.31, which is greater than the required standard Factor of Safety of 10. Therefore, the design is safe for procurement."*

#### Step 11: Report / Engineering Notebook and Reflection
* **What you will see:** Final reflection questions regarding what you learned.
* **What you must do:** Write brief reflections on your experience.
* **Sample Answers:**
  * **What did you learn from this project?** *"I learned how to apply Factor of Safety standards to a real-world mechanical design problem and how to transition from theoretical calculations to standard component selection."*
  * **Which engineering concept became clearer?** *"The load path—understanding exactly how forces transfer from the passengers through the cabin frame and into the suspension ropes—became much clearer."*

#### Final Step: Submit
Once all tasks are completed, navigate to the **Submission Summary** screen, verify your progress is at **100%**, and click the green **Submit Assignment** button.

---

### 5. Submitting Your Assignment

Once you have completed all tasks, you will reach the **Submission Summary** screen.

1. **Review**: The system will show a progress bar indicating how many activities you've completed. Make sure it says **100%**.
2. **Submit**: Click the green **Submit Assignment** button.
3. **Wait for Confirmation**: The system will validate your answers and communicate with the server. If successful, you will see a **"Submission successful!"** alert.

#### Offline / Network Error Handling
If your internet connection drops while you are submitting, **do not panic**. MEILP has a built-in offline queue.
* The system will save your submission locally on your device.
* It will automatically try to resubmit when the network is restored.
* You can safely close the tab if the system tells you your submission has been queued locally. 

---

### 6. Need Help?

* **Lost your progress?** The platform auto-saves your current draft to your browser. If you accidentally refresh the page, your answers will still be there as long as you are using the same device and browser.
* **Locked Fields?** If a field is greyed out, it means it is automatically calculated or populated by the system.
* **Incorrect Answers?** For some assignments, the system will auto-grade your standard selections. Ensure you are following proper rounding and Factor of Safety (FOS) rules as taught in class.

Good luck with your design engineering projects!
