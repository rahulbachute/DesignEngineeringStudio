class ChallengesEngine {
  constructor() {
    this.challenges = [];
    this.filteredChallenges = [];
  }

  async init() {
    this.bindEvents();
    await this.loadChallenges();
  }

  async loadChallenges() {
    try {
      const response = await fetch('../data/assignments.json');
      if (response.ok) {
        const data = await response.json();
        this.challenges = (data.assignments || []).map((c) => {
          let launchPath = c.launchPath || `assignment-workbench.html?assignment=${c.slug || c.id}`;
          if (launchPath && !launchPath.startsWith('../') && !launchPath.startsWith('/') && !launchPath.startsWith('http')) {
            launchPath = '../' + launchPath;
          }
          return { ...c, launchPath };
        });
      } else {
        this.challenges = this.getDefaultAssignments();
      }
    } catch (e) {
      console.warn('Loading default assignments catalog:', e);
      this.challenges = this.getDefaultAssignments();
    }

    this.filteredChallenges = [...this.challenges];
    this.renderKpis();
    this.renderGrid();
  }

  getDefaultAssignments() {
    return [
      {
        id: "EC-01",
        title: "Safety Verification of Elevator Suspension Cables",
        discipline: "Design of Machine Elements",
        summary: "Configuration-driven engineering challenge for independent elevator suspension cable review.",
        status: "Ready",
        tasks: 9,
        icon: "bi-building-gear",
        configPath: "assignments/elevator/config.json",
        launchPath: "../assignment-workbench.html?assignment=elevator",
        slug: "elevator",
        co: "CO1",
        weightage: "12 Marks"
      },
      {
        id: "EC-02",
        title: "Determine factor of safety of motorcycle stand and verify whether design is safe",
        discipline: "Design of Machine Elements",
        summary: "Template-authored engineering challenge for side stand stability and load reasoning.",
        status: "Ready",
        tasks: 9,
        icon: "bi-bicycle",
        configPath: "assignments/motorcycle/config.json",
        launchPath: "../assignment-workbench.html?assignment=motorcycle",
        slug: "motorcycle",
        co: "CO1, CO2",
        weightage: "12 Marks"
      },
      {
        id: "EC-03",
        title: "Engineering Materials Selection in Two-Wheeler Components",
        discipline: "Design of Machine Elements",
        summary: "Engineering challenge scaffold for material selection decisions across two-wheeler components.",
        status: "Ready",
        tasks: 11,
        icon: "bi-tools",
        configPath: "assignments/materials-selection/config.json",
        launchPath: "../assignment-workbench.html?assignment=materials-selection",
        slug: "materials-selection",
        co: "CO3",
        weightage: "12 Marks"
      },
      {
        id: "EC-04",
        title: "Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever",
        discipline: "Design of Machine Elements",
        summary: "Configuration-driven engineering challenge for borewell pump hand lever safety and ergonomics.",
        status: "Ready",
        tasks: 14,
        icon: "bi-tools",
        configPath: "assignments/borewell-pump/config.json",
        launchPath: "../assignment-workbench.html?assignment=borewell-pump",
        slug: "borewell-pump",
        co: "CO1, CO3",
        weightage: "12 Marks"
      },
      {
        id: "EC-05",
        title: "Failure Analysis and Material Selection of a Failed Mechanical Component",
        discipline: "Design of Machine Elements",
        summary: "Engineering challenge to investigate the failure mechanism, material, and factor of safety of a bolted joint.",
        status: "Ready",
        tasks: 14,
        icon: "bi-wrench",
        configPath: "assignments/failure-analysis/config.json",
        launchPath: "../assignment-workbench.html?assignment=failure-analysis",
        slug: "failure-analysis",
        co: "CO5",
        weightage: "12 Marks"
      },
      {
        id: "EC-06",
        title: "Stress Concentration Analysis of a Plate with a Central Hole",
        discipline: "Design of Machine Elements",
        summary: "Engineering challenge to analyze stress concentration, nominal vs peak stress, material selection, and safety factor of a plate with a hole.",
        status: "Ready",
        tasks: 13,
        icon: "bi-symmetry-horizontal",
        configPath: "assignments/stress-concentration/config.json",
        launchPath: "../assignment-workbench.html?assignment=stress-concentration",
        slug: "stress-concentration",
        co: "CO4",
        weightage: "12 Marks"
      },
      {
        id: "EC-07",
        title: "Design of Shaft for a Real-World Engineering Application",
        discipline: "Design of Machine Elements",
        summary: "Engineering challenge to determine loading, bearing reactions, bending moment, torque, combined loading, required shaft diameter, and factor of safety for a power transmission shaft.",
        status: "Ready",
        tasks: 11,
        icon: "bi-gear-wide-connected",
        configPath: "assignments/shafts/config.json",
        launchPath: "../assignment-workbench.html?assignment=shafts",
        slug: "shafts",
        co: "CO2",
        weightage: "12 Marks"
      },
      {
        id: "EC-08",
        title: "Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission",
        discipline: "Design of Machine Elements",
        summary: "Engineering challenge to analyze shaft-hub-key connections, transmitted torque, tangential force, key width and height, shear and crushing failure modes, factor of safety, and final key selection.",
        status: "Ready",
        tasks: 11,
        icon: "bi-key-fill",
        configPath: "assignments/Keys/config.json",
        launchPath: "../assignment-workbench.html?assignment=Keys",
        slug: "Keys",
        co: "CO2",
        weightage: "12 Marks"
      }
    ];
  }

  bindEvents() {
    const search = document.getElementById('challengeSearch');
    if (search) {
      search.addEventListener('input', (e) => this.filterGrid(e.target.value));
    }
  }

  filterGrid(searchTerm = '') {
    const term = searchTerm.toLowerCase().trim();
    this.filteredChallenges = this.challenges.filter((c) => 
      c.title.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term) ||
      c.summary.toLowerCase().includes(term)
    );
    this.renderGrid();
  }

  renderKpis() {
    const kpiEl = document.getElementById('challengeKpiSummary');
    if (!kpiEl) return;
    const totalTasks = this.challenges.reduce((sum, c) => sum + (c.tasks || 0), 0);
    kpiEl.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="small text-muted mb-1">Total Assignments</div>
            <div class="fs-4 fw-bold text-primary">${this.challenges.length} Active Challenges</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="small text-muted mb-1">Total Workflow Tasks</div>
            <div class="fs-4 fw-bold text-success">${totalTasks} Guided Activities</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="small text-muted mb-1">Assessment Engine</div>
            <div class="fs-4 fw-bold text-dark">12 Marks Rubric Each</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div class="small text-muted mb-1">Accreditation Mapping</div>
            <div class="fs-4 fw-bold text-info">100% CO/PO/PSO/WK</div>
          </div>
        </div>
      </div>
    `;
  }

  renderGrid() {
    const gridEl = document.getElementById('challengeGrid');
    if (!gridEl) return;

    if (this.filteredChallenges.length === 0) {
      gridEl.innerHTML = '<div class="col-12 text-muted p-4 text-center">No matching challenges found in the studio library.</div>';
      return;
    }

    gridEl.innerHTML = this.filteredChallenges.map((c) => `
      <div class="col-lg-6 col-xl-6">
        <div class="card border-0 shadow-sm rounded-4 h-100 position-relative overflow-hidden hover-shadow transition">
          <div class="card-header bg-white border-bottom-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-start">
            <div class="d-flex align-items-center gap-3">
              <div class="bg-primary-subtle text-primary p-3 rounded-4 fs-4">
                <i class="bi ${c.icon || 'bi-gear'}"></i>
              </div>
              <div>
                <span class="badge bg-dark text-white rounded-pill px-3 py-1 mb-1">${this.escapeHtml(c.id)}</span>
                <h5 class="h6 fw-bold mb-0 text-dark">${this.escapeHtml(c.title)}</h5>
              </div>
            </div>
            <span class="badge bg-success-subtle text-success-emphasis rounded-pill px-3 py-1">${this.escapeHtml(c.status || 'Ready')}</span>
          </div>
          <div class="card-body px-4 py-3">
            <p class="small text-secondary mb-3">${this.escapeHtml(c.summary)}</p>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge bg-light text-dark border"><i class="bi bi-list-check me-1"></i>${c.tasks || 10} Tasks</span>
              <span class="badge bg-light text-dark border"><i class="bi bi-award me-1"></i>${c.weightage || '12 Marks'}</span>
              <span class="badge bg-info-subtle text-info-emphasis"><i class="bi bi-bullseye me-1"></i>${c.co || 'CO1-CO5'}</span>
              <span class="badge bg-secondary-subtle text-secondary-emphasis"><i class="bi bi-book me-1"></i>${this.escapeHtml(c.discipline)}</span>
            </div>
          </div>
          <div class="card-footer bg-light border-top-0 px-4 py-3 d-flex justify-content-between align-items-center gap-2">
            <a href="${c.launchPath || `../assignment-workbench.html?assignment=${c.slug}`}" target="_blank" class="btn btn-primary btn-sm rounded-pill px-3">
              <i class="bi bi-rocket-takeoff me-1"></i>Student Workbench
            </a>
            <div class="d-flex gap-1">
              <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="window.challengesEngine.openDetailsModal('${c.id}')">
                <i class="bi bi-info-circle me-1"></i>Details
              </button>
              <a href="submissions.html?challenge=${encodeURIComponent(c.title)}" class="btn btn-outline-dark btn-sm rounded-pill px-3">
                <i class="bi bi-file-earmark-text me-1"></i>Submissions
              </a>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  openDetailsModal(id) {
    const c = this.challenges.find((item) => item.id === id);
    if (!c) return;

    const modalTitle = document.getElementById('challengeModalTitle');
    const modalBody = document.getElementById('challengeModalBody');

    if (modalTitle) modalTitle.textContent = `${c.id} - ${c.title}`;
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="row g-3 mb-3">
          <div class="col-md-6"><strong>Discipline:</strong> ${this.escapeHtml(c.discipline)}</div>
          <div class="col-md-6"><strong>Status:</strong> <span class="badge bg-success">${c.status}</span></div>
          <div class="col-md-6"><strong>Total Tasks:</strong> ${c.tasks} Guided Activities</div>
          <div class="col-md-6"><strong>Max Weightage:</strong> ${c.weightage || '12 Marks'}</div>
          <div class="col-md-6"><strong>CO Mapping:</strong> ${c.co || 'CO1-CO5'}</div>
          <div class="col-md-6"><strong>Config Location:</strong> <code>${c.configPath}</code></div>
        </div>
        <hr />
        <h6 class="fw-bold">Engineering Summary</h6>
        <p class="small text-muted">${this.escapeHtml(c.summary)}</p>
        <h6 class="fw-bold mt-3">Rubric & Assessment Criteria</h6>
        <ul class="small text-secondary mb-3">
          <li><strong>Given Data & Identification:</strong> 2 Marks</li>
          <li><strong>Engineering Calculation & FOS:</strong> 6 Marks</li>
          <li><strong>Decision Justification & Safety Assessment:</strong> 4 Marks</li>
        </ul>
        <div class="d-flex gap-2 justify-content-end mt-4">
          <a href="${c.launchPath}" target="_blank" class="btn btn-primary btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i>Open Student View</a>
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
        </div>
      `;
    }

    const modalEl = document.getElementById('challengeDetailsModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  escapeHtml(val) {
    return String(val || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.challengesEngine = new ChallengesEngine();
  window.challengesEngine.init();
});
