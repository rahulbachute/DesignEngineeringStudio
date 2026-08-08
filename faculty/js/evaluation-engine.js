class EvaluationEngine {
  constructor() {
    this.currentEvaluation = this.createEmptyEvaluation();
    this.activityState = [];
    this.isLoading = false;
    this.facultyName = window.DESAuth?.getCurrentUser?.().name || 'Faculty';

    this.elements = {
      header: document.getElementById('evaluationHeader'),
      activities: document.getElementById('activityEvaluationList'),
      summary: document.getElementById('summaryPanel'),
      acceptAllButton: document.getElementById('acceptAllSuggestedMarks'),
      resetButton: document.getElementById('resetToSystemMarks'),
      saveButton: document.getElementById('saveEvaluation'),
      submitButton: document.getElementById('submitFinalEvaluation'),
      backButton: document.getElementById('backToSubmissions')
    };
  }

  async init() {
    this.bindEvents();
    this.renderLoadingState();
    const isGuest = window.DESAuth?.isGuest?.() || localStorage.getItem("loggedInFaculty")?.toLowerCase() === "guest";
    if (isGuest) {
      if (this.elements.saveButton) this.elements.saveButton.disabled = true;
      if (this.elements.submitButton) this.elements.submitButton.disabled = true;
      if (this.elements.acceptAllButton) this.elements.acceptAllButton.disabled = true;
      if (this.elements.resetButton) this.elements.resetButton.disabled = true;
    }
    try {
      const submissionId = this.getSubmissionIdFromUrl();
      if (!submissionId) {
        if (this.elements.activities) {
          this.elements.activities.innerHTML = `
            ${isGuest ? `
            <div class="alert alert-warning border-0 shadow-sm rounded-4 mb-4 d-flex align-items-center gap-3">
              <i class="bi bi-shield-exclamation fs-3 text-warning"></i>
              <div>
                <strong>Guest Mode (Read-Only Evaluation)</strong>
                <p class="mb-0 small text-muted">You are logged in as a Guest. You can explore student responses, system suggested marks, and evaluation rubrics, but saving or submitting evaluations is disabled.</p>
              </div>
            </div>` : ''}
            <div class="alert alert-info text-center my-5 p-5 border-0 shadow-sm rounded-4">
              <i class="bi bi-person-lines-fill fs-1 d-block mb-3 text-primary"></i>
              <h4>No Student Selected</h4>
              <p class="text-muted">You have accessed the Evaluation Engine directly. To view or evaluate students, please go to the <strong>Student Submissions</strong> page.</p>
              <a href="submissions.html" class="btn btn-primary mt-3 px-4 py-2">Go to Student Submissions</a>
            </div>
          `;
        }
        if (this.elements.saveButton) this.elements.saveButton.disabled = true;
        if (this.elements.submitButton) this.elements.submitButton.disabled = true;
        this.renderHeader();
        this.renderSummary();
        return;
      }

      const submission = await DESEvaluationService.getSubmission(submissionId);
      if (submission) {
        this.currentEvaluation = this.createEvaluationFromSubmission(submission);
        this.activityState = this.createActivityState(this.currentEvaluation.activities);
      }
      this.renderHeader();
      this.renderActivities();
      this.renderSummary();
    } catch (error) {
      this.showToast(error.message || 'Unable to load evaluation details.', true);
    }
  }

  createEmptyEvaluation() {
    return {
      studentName: '',
      prn: '',
      branch: '',
      division: '',
      challengeName: '',
      attemptNumber: 1,
      submissionDate: '',
      timeTaken: '',
      submissionStatus: 'No Submission Selected',
      submissionId: '',
      activities: []
    };
  }

  getSubmissionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('submissionId') || params.get('id') || '';
  }

  isCalculationActivity(activity) {
    if (!activity) return false;
    if (activity.category === 'Calculation' || activity.isCalculation) return true;
    const text = `${activity.id || ''} ${activity.name || ''} ${activity.title || ''} ${activity.category || ''} ${activity.response || ''}`.toLowerCase();
    return text.includes('calc') || text.includes('torque') || text.includes('stress') || text.includes('force') || text.includes('moment') || text.includes('fos') || text.includes('diameter') || text.includes('area') || text.includes('reaction') || text.includes('index') || text.includes('modulus') || text.includes('f_hand') || text.includes('tau_act') || text.includes('sigma');
  }

  getStepwiseActivitiesForChallenge(challengeName) {
    const name = String(challengeName || '').toLowerCase();
    
    if (name.includes('shaft') || name.includes('ec-07')) {
      return [
        { id: 'ec07-act-1', name: 'Task 1: System Specifications & Given Data', response: 'Power P = 15 kW, Speed N = 720 rpm, Radial Load Fr = 3000 N, Span L = 500 mm', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec07-act-2', name: 'Task 2: Transmitted Torque Calculation', response: 'T = (60 * 10^6 * 15) / (2 * pi * 720) = 198,944 N-mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec07-act-3', name: 'Task 3: Bearing Reaction Forces (RA & RB)', response: 'RA = 1500 N, RB = 1500 N (Symmetric central load)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec07-act-4', name: 'Task 4: Peak Bending Moment (SFD/BMD)', response: 'M_max = (3000 * 500) / 4 = 375,000 N-mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec07-act-5', name: 'Task 5: Equivalent Combined Torque (Te)', response: 'Te = sqrt(M^2 + T^2) = 424,382 N-mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec07-act-6', name: 'Task 6: Required Shaft Diameter Calculation', response: 'Required d = 28.5 mm. Standard size selected d = 30 mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec07-act-7', name: 'Task 7: Factor of Safety & Rigidity Verification', response: 'Shear FOS = 2.45, Torsional Deflection = 0.12 deg/m (Safe)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' }
      ];
    }

    if (name.includes('key') || name.includes('ec-08')) {
      return [
        { id: 'ec08-act-1', name: 'Task 1: System Parameters & Transmitted Torque', response: 'P = 15 kW, N = 720 rpm, d = 40 mm, T = 145,892 N-mm', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-2', name: 'Task 2: Tangential Force on Key (Ft)', response: 'Ft = (2 * T) / d = (2 * 145,892) / 40 = 7,295 N', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-3', name: 'Task 3: Key Shear Stress Calculation (tau_act)', response: 'tau_act = Ft / (w * L) = 7,295 / (12 * 37.5) = 16.21 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-4', name: 'Task 4: Key Crushing Stress Calculation (sigma_c_act)', response: 'sigma_c_act = (2 * Ft) / (h * L) = (2 * 7,295) / (12 * 37.5) = 32.42 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-5', name: 'Task 5: Key Shear & Crushing Factor of Safety', response: 'Shear FOS = 11.10, Crushing FOS = 11.10 (Safe under load)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec08-act-6', name: 'Task 6: Standard Sunk Key Selection & Final Decision', response: 'Standard Parallel Sunk Key selected (12 x 12 x 37.5 mm)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    if (name.includes('elevator') || name.includes('ec-01')) {
      return [
        { id: 'ec01-act-1', name: 'Task 1: Project Charter & System Capacity', response: 'Passenger Load = 680 kg, Elevator Car = 1200 kg, Speed = 1.5 m/s, Accel = 1.2 m/s^2', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec01-act-2', name: 'Task 2: Component Identification', response: '6x19 Steel Wire Ropes, Traction Sheave, Counterweight System', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec01-act-3', name: 'Task 3: Working Principle & Cable Selection', response: 'Traction drive with 6 independent suspension ropes', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec01-act-4', name: 'Task 4: Free Body Diagram & Load Distribution', response: 'Equal load distribution per suspension cable verified', maxMarks: 1, systemSuggestedMarks: 1, category: 'Analysis' },
        { id: 'ec01-act-5', name: 'Task 5: Acceleration Force & Total Tension', response: 'Total Tension T = m(g + a) = 1880 * (9.81 + 1.2) = 20,698 N', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec01-act-6', name: 'Task 6: Suspension Cable Stress Analysis', response: 'Tensile Stress sigma = T / A_total = 42.5 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec01-act-7', name: 'Task 7: Material Selection & Wire Rope Grade', response: 'Extra Improved Plow Steel (EIPS 1960 N/mm^2 grade)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec01-act-8', name: 'Task 8: Cable Safety Factor & Verification', response: 'Calculated FOS = 12.4 (Exceeds code requirement of 10.0)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    if (name.includes('motorcycle') || name.includes('ec-02')) {
      return [
        { id: 'ec02-act-1', name: 'Task 1: Stand Geometry & Load Identification', response: 'Motorcycle Mass = 185 kg, Ground Angle = 15 deg, Load on Stand = 750 N', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec02-act-2', name: 'Task 2: Ground Contact & Stability Principle', response: 'Tri-point support stability verified with center of gravity', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec02-act-3', name: 'Task 3: Material Selection (Mild Steel vs Structural Alloy)', response: 'Seamless Structural Steel Tube (Fe 410) selected', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec02-act-4', name: 'Task 4: Bending Moment & Direct Axial Load', response: 'Max Bending Moment M = 750 * 0.12 = 90 N-m, Axial Load P = 750 N', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec02-act-5', name: 'Task 5: Section Modulus Z Calculation', response: 'Hollow Circular Section (OD = 25 mm, ID = 20 mm), Z = 1402 mm^3', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec02-act-6', name: 'Task 6: Combined Bending & Biaxial Stress Analysis', response: 'sigma_b = M / Z = 64.2 MPa, sigma_a = 5.1 MPa, Total = 69.3 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec02-act-7', name: 'Task 7: Stand Factor of Safety & Verification', response: 'FOS = Syt / sigma = 220 / 69.3 = 3.17 (Safe side stand design)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    if (name.includes('material') || name.includes('ec-03')) {
      return [
        { id: 'ec03-act-1', name: 'Task 1: Component Function & Service Conditions', response: 'Connecting Rod subject to high cyclic tension and compression loads', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec03-act-2', name: 'Task 2: Ashby Material Property Index (M = Syt / rho)', response: 'M1 (Forged Steel) = 75, M2 (Al 7075-T6) = 185, M3 (Ti-6Al-4V) = 190', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec03-act-3', name: 'Task 3: Design Review Station 1 (Chassis Frame)', response: 'Tubular Steel Frame chosen for high stiffness-to-cost ratio', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec03-act-4', name: 'Task 4: Design Review Station 2 (Engine Connecting Rod)', response: 'Forged Micro-Alloyed Steel 4340 for fatigue endurance', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec03-act-5', name: 'Task 5: Design Review Station 3 (Wheels & Braking System)', response: 'Cast Aluminum Alloy A356 for light weight and heat dissipation', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec03-act-6', name: 'Task 6: Design Review Station 4 (Fuel Tank & System)', response: 'Deep Drawing Quality Cold Rolled Steel with internal coating', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' },
        { id: 'ec03-act-7', name: 'Task 7: Cost-Performance Tradeoff & Final Decision', response: 'Optimal balance achieved across strength, mass, and manufacturing cost', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' }
      ];
    }

    if (name.includes('borewell') || name.includes('ec-04')) {
      return [
        { id: 'ec04-act-1', name: 'Task 1: Component Identification', response: 'Lever arm, fulcrum pin, pump rod link, handle grip identified', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec04-act-2', name: 'Task 2: Working Principle & Mechanical Advantage', response: 'Class 1 lever mechanism with Mechanical Advantage = 4.5', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec04-act-3', name: 'Task 3: Design Requirements & Lever Geometry', response: 'Operating lift depth = 40m, Effort arm L1 = 900mm, Load arm L2 = 200mm', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec04-act-4', name: 'Task 4: Engineering Assumptions & User Effort', response: 'Standard human operating effort F_hand = 150 N max', maxMarks: 0.5, systemSuggestedMarks: 0.5, category: 'Analysis' },
        { id: 'ec04-act-5', name: 'Task 5: Ergonomic Analysis', response: 'Grip diameter 32mm, comfortable height range 900-1100mm', maxMarks: 0.5, systemSuggestedMarks: 0.5, category: 'Analysis' },
        { id: 'ec04-act-6', name: 'Task 6: Free Body Diagram', response: 'Equilibrium equations sum F_y = 0 and sum M_fulcrum = 0', maxMarks: 1, systemSuggestedMarks: 1, category: 'Analysis' },
        { id: 'ec04-act-7', name: 'Task 7: Mechanical Advantage & Force Analysis', response: 'Resisting pump force F_pump = 150 * 4.5 = 675 N', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-8', name: 'Task 8: Reaction Forces at Fulcrum Pin', response: 'Pin Reaction R_fulcrum = F_hand + F_pump = 825 N', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-9', name: 'Task 9: Maximum Bending Moment Calculation', response: 'M_max = F_hand * L1 = 150 * 0.9 = 135 N-m at fulcrum', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-10', name: 'Task 10: Lever Cross-Section Properties', response: 'Rectangular section (b = 30 mm, h = 12 mm), Z = (b*h^2)/6 = 720 mm^3', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-11', name: 'Task 11: Bending Stress Analysis', response: 'sigma_bending = M / Z = 135,000 / 720 = 187.5 MPa', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec04-act-12', name: 'Task 12: Material Selection & Yield Strength', response: 'Forged Structural Steel C45 (Syt = 360 MPa)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' },
        { id: 'ec04-act-13', name: 'Task 13: Factor of Safety Verification', response: 'FOS = Syt / sigma = 360 / 187.5 = 1.92 (Safe ergonomic lever design)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' }
      ];
    }

    if (name.includes('failure') || name.includes('ec-05')) {
      return [
        { id: 'ec05-act-1', name: 'Task 1: Component Identification & Bolted Joint Layout', response: 'High-strength flange connection bolt M12 x 1.75', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec05-act-2', name: 'Task 2: Fracture Surface Visual Diagnostics', response: 'Beach marks, ratchet lines, and small final fast fracture zone (Fatigue)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec05-act-3', name: 'Task 3: Free Body Diagram & Preload Force Flow', response: 'Tightening torque T_t = 85 N-m producing bolt preload Fi = 35 kN', maxMarks: 1, systemSuggestedMarks: 1, category: 'Analysis' },
        { id: 'ec05-act-4', name: 'Task 4: Bolt Tensile Stress Area (At) Calculation', response: 'M12 Bolt Tensile Stress Area At = 84.3 mm^2', maxMarks: 1, systemSuggestedMarks: 1, category: 'Calculation' },
        { id: 'ec05-act-5', name: 'Task 5: Tensile & Shear Stress Analysis', response: 'Direct Tensile Stress sigma_t = P / At = 280 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec05-act-6', name: 'Task 6: Stress Concentration at Thread Root', response: 'Thread root Kt = 3.2, Peak stress = 896 MPa exceeding yield', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec05-act-7', name: 'Task 7: High-Cycle Fatigue Endurance Limit', response: 'Corrected endurance limit S_e = 0.5 * Sut * ka * kb = 240 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec05-act-8', name: 'Task 8: Material Upgrade & Factor of Safety Decision', response: 'Upgrade bolt grade from Class 8.8 to 10.9 with rolled threads (FOS = 2.15)', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    if (name.includes('stress') || name.includes('concentration') || name.includes('ec-06')) {
      return [
        { id: 'ec06-act-1', name: 'Task 1: Component Identification & Plate Geometry', response: 'Flat Plate with central circular hole: W = 100 mm, d = 20 mm, t = 10 mm', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec06-act-2', name: 'Task 2: Boundary Conditions & Uniform Loading', response: 'Uniaxial tensile load P = 50,000 N applied at ends', maxMarks: 1, systemSuggestedMarks: 1, category: 'Identification' },
        { id: 'ec06-act-3', name: 'Task 3: Free Body Diagram', response: 'Net cross section area A_net = (W - d) * t = 800 mm^2', maxMarks: 1, systemSuggestedMarks: 1, category: 'Analysis' },
        { id: 'ec06-act-4', name: 'Task 4: Nominal Stress Calculation (sigma_nom)', response: 'sigma_nom = P / A_net = 50,000 / 800 = 62.5 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec06-act-5', name: 'Task 5: Stress Concentration Factor (Kt) Determination', response: 'Ratio d/W = 0.20. From Peterson Chart, Kt = 2.51', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec06-act-6', name: 'Task 6: Peak Stress Calculation (sigma_max)', response: 'sigma_max = Kt * sigma_nom = 2.51 * 62.5 = 156.88 MPa', maxMarks: 2, systemSuggestedMarks: 2, category: 'Calculation' },
        { id: 'ec06-act-7', name: 'Task 7: Material Selection & Yield Strength', response: 'Structural Steel Fe 410 (Syt = 310 MPa)', maxMarks: 1, systemSuggestedMarks: 1, category: 'Design Decision' },
        { id: 'ec06-act-8', name: 'Task 8: Factor of Safety & Relief Hole Design', response: 'FOS = Syt / sigma_max = 310 / 156.88 = 1.98. Auxiliary relief holes added', maxMarks: 2, systemSuggestedMarks: 2, category: 'Design Decision' }
      ];
    }

    return [
      { id: 'gen-act-1', name: 'Task 1: Given Data & System Identification', response: 'System parameters, loads, and boundary conditions identified', maxMarks: 2, systemSuggestedMarks: 2, category: 'Identification' },
      { id: 'gen-act-2', name: 'Task 2: Engineering Calculations & Stress Analysis', response: 'Calculations completed according to engineering formulas', maxMarks: 6, systemSuggestedMarks: 6, category: 'Calculation' },
      { id: 'gen-act-3', name: 'Task 3: Safety Factor Verification & Design Decision', response: 'Factor of safety verified against design standards', maxMarks: 4, systemSuggestedMarks: 4, category: 'Design Decision' }
    ];
  }

  getExpectedActivityCount(challengeName) {
    const name = String(challengeName || '').toLowerCase();
    if (name.includes('borewell') || name.includes('ec-04')) return 13;
    if (name.includes('elevator') || name.includes('ec-01')) return 8;
    if (name.includes('failure') || name.includes('ec-05')) return 8;
    if (name.includes('stress') || name.includes('ec-06')) return 8;
    if (name.includes('motorcycle') || name.includes('ec-02')) return 7;
    if (name.includes('material') || name.includes('ec-03')) return 7;
    if (name.includes('shaft') || name.includes('ec-07')) return 6;
    if (name.includes('key') || name.includes('ec-08')) return 6;
    return 3;
  }

  createEvaluationFromSubmission(submission) {
    let sourceActivities = submission.activities || [];
    const isGenericPlaceholder = sourceActivities.length > 0 && sourceActivities.every((a) => a.id === 'act-1' || a.id === 'act-2' || a.name === 'Real-World Component Data' || a.name === 'Engineering Calculation Engine');
    const expectedCount = this.getExpectedActivityCount(submission.challenge || submission.challengeId);

    if (!sourceActivities.length || sourceActivities.length < expectedCount || isGenericPlaceholder) {
      sourceActivities = this.getStepwiseActivitiesForChallenge(submission.challenge || submission.challengeId);
    }

    return {
      studentName: submission.studentName,
      prn: submission.prn,
      branch: submission.branch,
      division: submission.division,
      challengeName: submission.challenge,
      attemptNumber: submission.attempt,
      submissionDate: submission.submittedOn,
      timeTaken: submission.timeTaken,
      submissionStatus: submission.submissionStatus,
      submissionId: submission.id,
      activities: sourceActivities.map((activity) => {
        const isCalc = this.isCalculationActivity(activity);
        return {
          ...activity,
          title: activity.name || activity.title,
          evaluationType: isCalc ? 'Calculation (Auto-Assessed)' : (activity.category || 'Faculty Evaluation'),
          subType: isCalc ? 'System Formula Evaluation' : 'Faculty Subjective Review',
          studentResponse: activity.response,
          correctAnswer: activity.correctAnswer || (isCalc ? 'Auto-evaluated calculation formula' : 'Faculty evaluation criterion'),
          systemSuggestedMarks: Number(activity.systemSuggestedMarks) || Number(activity.maxMarks) || 2,
          category: activity.category || 'Activity'
        };
      })
    };
  }

  createActivityState(activities) {
    return activities.map((activity) => ({
      ...activity,
      facultyMarks: activity.systemSuggestedMarks,
      reason: '',
      isModified: false,
      timestamp: new Date().toISOString(),
      facultyName: this.facultyName
    }));
  }

  bindEvents() {
    this.elements.activities.addEventListener('input', (event) => {
      const input = event.target.closest('[data-activity-input]');
      if (!input) {
        return;
      }

      const activityId = input.dataset.activityId;
      const activity = this.activityState.find((item) => item.id === activityId);
      if (!activity) {
        return;
      }

      const value = Number(input.value);
      if (!Number.isNaN(value)) {
        activity.facultyMarks = value;
        activity.isModified = value !== activity.systemSuggestedMarks;
        if (!activity.isModified) {
          activity.reason = '';
        }
        this.renderSummary();
        this.renderActivityCard(activityId);
      }
    });

    this.elements.activities.addEventListener('change', (event) => {
      const reasonField = event.target.closest('[data-reason-input]');
      if (!reasonField) {
        return;
      }

      const activityId = reasonField.dataset.activityId;
      const activity = this.activityState.find((item) => item.id === activityId);
      if (!activity) {
        return;
      }

      activity.reason = reasonField.value;
      this.renderSummary();
    });

    this.elements.acceptAllButton.addEventListener('click', () => {
      this.activityState.forEach((activity) => {
        activity.facultyMarks = activity.systemSuggestedMarks;
        activity.isModified = false;
        activity.reason = '';
      });
      this.renderActivities();
      this.renderSummary();
      this.showToast('All suggested marks accepted.');
    });

    this.elements.resetButton.addEventListener('click', () => {
      this.activityState.forEach((activity) => {
        activity.facultyMarks = activity.systemSuggestedMarks;
        activity.isModified = false;
        activity.reason = '';
      });
      this.renderActivities();
      this.renderSummary();
      this.showToast('Marks reset to system suggestions.');
    });

    this.elements.saveButton.addEventListener('click', async () => {
      try {
        await this.persistEvaluation('Draft');
        this.showToast('Evaluation saved through the repository layer.');
      } catch (error) {
        this.showToast(error.message || 'Evaluation save failed.', true);
      }
    });

    this.elements.submitButton.addEventListener('click', async () => {
      const validation = this.validateEvaluation();
      if (!validation.valid) {
        this.showToast(validation.message, true);
        return;
      }

      const confirmed = window.confirm('Submit final evaluation? This will mark the submission as evaluated.');
      if (confirmed) {
        try {
          await this.persistEvaluation('Evaluated');
          this.currentEvaluation.submissionStatus = 'Evaluated';
          this.renderHeader();
          this.showToast('Final evaluation submitted successfully.');
        } catch (error) {
          this.showToast(error.message || 'Final evaluation save failed.', true);
        }
      }
    });

    this.elements.backButton.addEventListener('click', () => {
      window.history.back();
    });
  }

  renderLoadingState() {
    if (this.elements.header) {
      this.elements.header.innerHTML = '<div class="text-muted">Loading evaluation details from the repository...</div>';
    }
    if (this.elements.activities) {
      this.elements.activities.innerHTML = '<div class="text-muted">Preparing activities...</div>';
    }
  }

  async persistEvaluation(status) {
    if (window.DESAuth?.isGuest?.() || localStorage.getItem("loggedInFaculty")?.toLowerCase() === "guest") {
      throw new Error('Guest users cannot perform evaluation.');
    }

    if (!this.currentEvaluation.submissionId) {
      throw new Error('No submission is selected for evaluation.');
    }

    const payload = this.buildEvaluationPayload(status);
    payload.evaluatedBy = localStorage.getItem("loggedInFaculty") || "unknown";
    const result = await DESEvaluationService.saveEvaluation(payload);
    if (!result || result.success === false || result.ok === false || result.error) {
      throw new Error(result?.error || result?.message || 'Evaluation save failed.');
    }
    return result;
  }

  buildEvaluationPayload(status) {
    const facultyMarks = this.activityState.map((activity) => ({
      id: activity.id,
      activityId: activity.id,
      name: activity.title || activity.name,
      marks: Number(activity.facultyMarks) || 0,
      facultyMarks: Number(activity.facultyMarks) || 0,
      maxMarks: Number(activity.maxMarks) || 0,
      reason: activity.reason || ''
    }));
    const totalMarks = facultyMarks.reduce((sum, activity) => sum + activity.marks, 0);
    const maxMarks = facultyMarks.reduce((sum, activity) => sum + activity.maxMarks, 0);
    const percentage = maxMarks ? Number(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;
    const rubricScores = facultyMarks.reduce((scores, activity) => {
      scores[activity.id || activity.name] = activity.marks;
      return scores;
    }, {});
    const currentUser = window.DESAuth?.getCurrentUser?.() || {};

    return {
      submissionId: this.currentEvaluation.submissionId,
      facultyName: currentUser.name || this.facultyName || 'Faculty',
      facultyEmail: currentUser.email || '',
      facultyMarks,
      evaluation: {
        activities: facultyMarks,
        totalMarks,
        maxMarks,
        percentage,
        evaluatedAt: new Date().toISOString()
      },
      rubricScores,
      totalMarks,
      maxMarks,
      percentage,
      remarks: this.collectRemarks(),
      feedback: this.collectRemarks(),
      status
    };
  }

  collectRemarks() {
    return this.activityState
      .filter((activity) => String(activity.reason || '').trim())
      .map((activity) => `${activity.title || activity.name}: ${activity.reason}`)
      .join('\n');
  }

  renderHeader() {
    this.elements.header.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Student Name</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.studentName)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">PRN</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.prn)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Branch / Division</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.branch)} · ${this.escapeHtml(this.currentEvaluation.division)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Submission Status</p>
            <span class="badge bg-warning-subtle text-warning-emphasis">${this.escapeHtml(this.currentEvaluation.submissionStatus)}</span>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Challenge</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.challengeName)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Attempt Number</p>
            <h5 class="mb-0">${this.currentEvaluation.attemptNumber}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Submission Date</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.submissionDate)}</h5>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="border rounded-4 p-3 h-100">
            <p class="text-muted small mb-1">Time Taken</p>
            <h5 class="mb-0">${this.escapeHtml(this.currentEvaluation.timeTaken)}</h5>
          </div>
        </div>
      </div>
    `;
  }

  renderActivities() {
    const isGuest = window.DESAuth?.isGuest?.() || localStorage.getItem("loggedInFaculty")?.toLowerCase() === "guest";
    const guestBanner = isGuest ? `
      <div class="alert alert-warning border-0 shadow-sm rounded-4 mb-4 d-flex align-items-center gap-3">
        <i class="bi bi-shield-exclamation fs-3 text-warning"></i>
        <div>
          <strong>Guest Mode (Read-Only Evaluation)</strong>
          <p class="mb-0 small text-muted">You are logged in as a Guest. You can explore student responses, system suggested marks, and evaluation rubrics, but saving or submitting evaluations is disabled.</p>
        </div>
      </div>
    ` : '';

    if (!this.activityState.length) {
      this.elements.activities.innerHTML = guestBanner + '<div class="text-muted">No activity responses are available for evaluation.</div>';
      return;
    }
    this.elements.activities.innerHTML = guestBanner + this.activityState.map((activity) => this.renderActivityCardMarkup(activity)).join('');
  }

  renderActivityCardMarkup(activity) {
    const isGuest = window.DESAuth?.isGuest?.() || localStorage.getItem("loggedInFaculty")?.toLowerCase() === "guest";
    const isCalc = this.isCalculationActivity(activity);
    const facultyMarks = activity.facultyMarks ?? (isCalc ? activity.systemSuggestedMarks : '');
    const systemDisplay = isCalc ? `${activity.systemSuggestedMarks}/${activity.maxMarks}` : 'N/A (Faculty Review)';
    const modified = activity.isModified;
    const disabledAttr = isGuest ? 'disabled readonly' : '';
    const reasonMarkup = modified ? `
      <div class="mt-3">
        <label class="form-label">Modification Reason</label>
        <textarea class="form-control" rows="2" data-reason-input data-activity-id="${activity.id}" placeholder="Reason is required when marks are changed" ${disabledAttr}>${this.escapeHtml(activity.reason || '')}</textarea>
      </div>
    ` : '';

    return `
      <div class="card border-0 shadow-sm rounded-4 mb-4">
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
            <div>
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                <h4 class="h5 mb-0">${this.escapeHtml(activity.title)}</h4>
                ${isCalc ? `
                  <span class="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill px-3 py-1">
                    <i class="bi bi-cpu me-1"></i>Auto-Assessed (System Engine)
                  </span>` : `
                  <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1">
                    <i class="bi bi-person-badge me-1"></i>Faculty Evaluation Required
                  </span>`}
                <span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2 py-1">${this.escapeHtml(activity.subType)}</span>
                ${modified ? '<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill px-2 py-1">Modified by Faculty</span>' : ''}
              </div>
              <p class="text-muted mb-0">Maximum Marks: ${activity.maxMarks}</p>
            </div>
            <div class="text-md-end">
              <p class="small text-muted mb-1">${isCalc ? 'Auto-Assessed Marks' : 'System Suggested Marks'}</p>
              <h5 class="mb-0 text-primary fw-bold">${systemDisplay}</h5>
            </div>
          </div>

          <div class="row g-4">
            <div class="col-lg-6">
              <div class="border rounded-4 p-3 h-100">
                <p class="text-muted small mb-2">Student Response</p>
                <p class="mb-0">${this.escapeHtml(activity.studentResponse)}</p>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="border rounded-4 p-3 h-100">
                <p class="text-muted small mb-2">Correct Answer / Rubric</p>
                <p class="mb-0">${this.escapeHtml(activity.correctAnswer)}</p>
              </div>
            </div>
          </div>

          <div class="row g-4 mt-1">
            <div class="col-md-4">
              <label class="form-label">System Suggested Marks</label>
              <input class="form-control" type="text" value="${isCalc ? activity.systemSuggestedMarks : 'N/A (Faculty Review)'}" readonly />
            </div>
            <div class="col-md-4">
              <label class="form-label">Faculty Marks</label>
              <input class="form-control" type="number" min="0" max="${activity.maxMarks}" step="0.5" value="${facultyMarks !== null && facultyMarks !== undefined ? facultyMarks : ''}" placeholder="${isCalc ? '' : 'Enter marks'}" data-activity-input data-activity-id="${activity.id}" ${disabledAttr} />
              ${isCalc ? '<div class="form-text text-success small mt-1"><i class="bi bi-check2-circle me-1"></i>Auto-calculated by system</div>' : '<div class="form-text text-warning-emphasis small mt-1"><i class="bi bi-pencil-square me-1"></i>Faculty grading required</div>'}
            </div>
            <div class="col-md-4">
              <label class="form-label">Faculty Remarks</label>
              <textarea class="form-control" rows="2" placeholder="${isGuest ? 'Disabled in Guest mode' : 'Optional remarks'}" ${disabledAttr}></textarea>
            </div>
          </div>

          ${reasonMarkup}
        </div>
      </div>
    `;
  }

  renderActivityCard(activityId) {
    const activity = this.activityState.find((item) => item.id === activityId);
    if (!activity) {
      return;
    }

    const cardMarkup = this.renderActivityCardMarkup(activity);
    const existingCard = this.elements.activities.querySelector(`[data-activity-id="${activityId}"]`);
    if (existingCard) {
      existingCard.outerHTML = cardMarkup;
    }
  }

  renderSummary() {
    const totalMax = this.activityState.reduce((sum, activity) => sum + activity.maxMarks, 0);
    const facultyTotal = this.activityState.reduce((sum, activity) => sum + Number(activity.facultyMarks || 0), 0);
    const systemTotal = this.activityState.reduce((sum, activity) => sum + activity.systemSuggestedMarks, 0);
    const percentage = totalMax > 0 ? Math.round((facultyTotal / totalMax) * 100) : 0;
    const grade = this.calculateGrade(percentage);

    this.elements.summary.innerHTML = `
      <div class="card border-0 shadow-sm rounded-4">
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
              <h3 class="h5 mb-2">Evaluation Summary</h3>
              <p class="text-muted mb-0">Faculty remains the final authority for all marks and remarks.</p>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <span class="badge bg-primary-subtle text-primary-emphasis">Maximum Marks ${totalMax}</span>
              <span class="badge bg-secondary-subtle text-secondary-emphasis">System Total ${systemTotal}</span>
              <span class="badge bg-success-subtle text-success-emphasis">Faculty Total ${facultyTotal}</span>
              <span class="badge bg-info-subtle text-info-emphasis">${percentage}%</span>
              <span class="badge bg-dark-subtle text-dark-emphasis">${grade}</span>
            </div>
          </div>
          <div class="progress mt-3" role="progressbar" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar" style="width: ${percentage}%;"></div>
          </div>
          <div class="row g-3 mt-2">
            <div class="col-md-4">
              <div class="border rounded-4 p-3">
                <p class="small text-muted mb-1">Evaluation Status</p>
                <h6 class="mb-0">${this.currentEvaluation.submissionStatus}</h6>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded-4 p-3">
                <p class="small text-muted mb-1">Audit Trail Entries</p>
                <h6 class="mb-0">${this.activityState.filter((activity) => activity.isModified).length}</h6>
              </div>
            </div>
            <div class="col-md-4">
              <div class="border rounded-4 p-3">
                <p class="small text-muted mb-1">Faculty Name</p>
                <h6 class="mb-0">${this.escapeHtml(this.facultyName)}</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  validateEvaluation() {
    const missingReasons = this.activityState.filter((activity) => activity.isModified && !activity.reason.trim());
    if (missingReasons.length) {
      return {
        valid: false,
        message: 'Please provide a modification reason for every overridden mark.'
      };
    }

    const invalidMarks = this.activityState.filter((activity) => Number(activity.facultyMarks) < 0 || Number(activity.facultyMarks) > activity.maxMarks);
    if (invalidMarks.length) {
      return {
        valid: false,
        message: 'Faculty marks cannot be negative or exceed the maximum marks.'
      };
    }

    const incomplete = this.activityState.some((activity) => Number.isNaN(Number(activity.facultyMarks)) || Number(activity.facultyMarks) === 0);
    if (incomplete) {
      return {
        valid: false,
        message: 'All activities must be evaluated before submission.'
      };
    }

    return {
      valid: true,
      message: 'Ready to submit.'
    };
  }

  calculateGrade(percentage) {
    if (percentage >= 90) {
      return 'A+';
    }
    if (percentage >= 80) {
      return 'A';
    }
    if (percentage >= 70) {
      return 'B+';
    }
    if (percentage >= 60) {
      return 'B';
    }
    if (percentage >= 50) {
      return 'C';
    }
    if (percentage >= 40) {
      return 'D';
    }
    return 'F';
  }

  showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `position-fixed top-0 end-0 m-3 toast align-items-center text-bg-${isError ? 'danger' : 'success'} border-0 show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="d-flex"><div class="toast-body">${this.escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EvaluationEngine().init();
});
