const fs = require('fs');
const assert = require('assert');
const path = require('path');

console.log('=== TEST: PUBLIC CCE ASSIGNMENTS PRESENTATION & SECTIONS ===\n');

// 1. Verify coursework.html in root and outputs/meilp
['coursework.html', 'outputs/meilp/coursework.html'].forEach(relPath => {
  const fullPath = path.resolve(__dirname, relPath);
  assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
  const html = fs.readFileSync(fullPath, 'utf8');

  // Verify existing DME assignments are intact
  assert.ok(html.includes('data-assignment-grid'), `${relPath} must retain data-assignment-grid for DME`);
  assert.ok(html.includes('Safety Verification of Elevator Suspension Cables'), `${relPath} must retain EC-01`);
  assert.ok(html.includes('Determine factor of safety of motorcycle stand'), `${relPath} must retain EC-02`);
  assert.ok(html.includes('Identification and Selection of Couplings'), `${relPath} must retain EC-09`);

  // Verify dedicated Transmission System Design section
  assert.ok(html.includes('id="transmissionSystemSection"'), `${relPath} must have transmissionSystemSection`);
  assert.ok(html.includes('Transmission System Design'), `${relPath} must have Transmission System Design heading`);
  assert.ok(html.includes('PCC353-MEC'), `${relPath} must identify course code PCC353-MEC`);
  assert.ok(html.includes('data-transmission-assignment-grid'), `${relPath} must have data-transmission-assignment-grid container`);
  assert.ok(html.includes('id="transmissionAssignmentGrid"'), `${relPath} must have transmissionAssignmentGrid id`);

  // Verify EA-TS-01 details
  assert.ok(html.includes('EA-TS-01'), `${relPath} must list EA-TS-01`);
  assert.ok(html.includes('Design of Helical Gears for High-Speed Rotary Equipment'), `${relPath} must have exact EA-TS-01 title`);
  assert.ok(html.includes('>CO1<'), `${relPath} must show CO1 badge`);
  assert.ok(html.includes('>12 Marks<'), `${relPath} must show 12 Marks badge`);
  assert.ok(html.includes('>Ready<'), `${relPath} must show Ready status`);
  assert.ok(html.includes('helical-gear-design'), `${relPath} must link to helical-gear-design launch destination`);

  // Verify EA-TS-02 details
  assert.ok(html.includes('EA-TS-02'), `${relPath} must list EA-TS-02`);
  assert.ok(html.includes('Design Parameters of Spur Gears for Industrial Conveyor Systems'), `${relPath} must have exact EA-TS-02 title`);
  assert.ok(html.includes('spur-gear-design'), `${relPath} must link to spur-gear-design launch destination`);

  console.log(`PASS: ${relPath} verified successfully.`);
});

// 2. Verify dynamic rendering via app.js
['js/app.js', 'outputs/meilp/js/app.js'].forEach(relPath => {
  const fullPath = path.resolve(__dirname, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');

  // Simulate DOM environment
  const mockStorage = {
    'meilp:activeRole': 'GUEST'
  };

  const dmeGridMock = { innerHTML: '' };
  const tsGridMock = { innerHTML: '' };

  const domElements = {
    '[data-assignment-grid]': dmeGridMock,
    '[data-transmission-assignment-grid]': tsGridMock,
    'transmissionAssignmentGrid': tsGridMock,
    'facultyStatusBanner': { innerHTML: '' },
    'btnShowAssignments': { disabled: false },
    'studentCollegeSelect': { value: '', disabled: false },
    'studentFacultySelect': { value: '', disabled: false }
  };

  const sandbox = {
    window: {
      MEILP: {},
      localStorage: {
        getItem: k => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = v; },
        removeItem: k => { delete mockStorage[k]; }
      },
      addEventListener: () => {},
      location: { href: '' }
    },
    document: {
      querySelector: sel => domElements[sel] || null,
      getElementById: id => domElements[id] || null,
      documentElement: { dataset: {} },
      addEventListener: () => {}
    },
    localStorage: {
      getItem: k => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = v; },
      removeItem: k => { delete mockStorage[k]; }
    },
    fetch: () => Promise.reject(new Error('offline')),
    setTimeout: () => {},
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    console
  };
  sandbox.window.document = sandbox.document;

  const vm = require('vm');
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  // Trigger renderAssignmentCards
  assert.strictEqual(typeof sandbox.window.MEILP.renderAssignmentCards, 'function', 'renderAssignmentCards must be exposed');
  sandbox.window.MEILP.renderAssignmentCards();

  // DME grid must contain DME assignments, NOT EA-TS-01
  assert.ok(dmeGridMock.innerHTML.includes('EC-01'), 'DME grid must contain EC-01');
  assert.ok(dmeGridMock.innerHTML.includes('EA-22'), 'DME grid must contain EA-22');
  assert.ok(!dmeGridMock.innerHTML.includes('EA-TS-01'), 'DME grid must NOT contain EA-TS-01');

  // TS grid must contain EA-TS-01 and EA-TS-02, NOT EC-01
  assert.ok(tsGridMock.innerHTML.includes('EA-TS-01'), 'TS grid must contain EA-TS-01');
  assert.ok(tsGridMock.innerHTML.includes('Design of Helical Gears for High-Speed Rotary Equipment'), 'TS grid must have exact title');
  assert.ok(tsGridMock.innerHTML.includes('EA-TS-02'), 'TS grid must contain EA-TS-02');
  assert.ok(tsGridMock.innerHTML.includes('Design Parameters of Spur Gears for Industrial Conveyor Systems'), 'TS grid must have exact EA-TS-02 title');
  assert.ok(tsGridMock.innerHTML.includes('CO1'), 'TS grid must show CO1');
  assert.ok(tsGridMock.innerHTML.includes('12 Marks'), 'TS grid must show 12 Marks');
  assert.ok(tsGridMock.innerHTML.includes('Ready'), 'TS grid must show Ready status');
  assert.ok(!tsGridMock.innerHTML.includes('EC-01'), 'TS grid must NOT contain DME assignments');

  // Test launchAssignment with EA-TS-01
  sandbox.window.MEILP.launchAssignment('EA-TS-01');
  assert.strictEqual(sandbox.window.location.href, 'assignment-workbench.html?assignment=helical-gear-design', 'launchAssignment must navigate to helical-gear-design workbench');

  // Test launchAssignment with EA-TS-02
  sandbox.window.MEILP.launchAssignment('EA-TS-02');
  assert.strictEqual(sandbox.window.location.href, 'assignment-workbench.html?assignment=spur-gear-design', 'launchAssignment must navigate to spur-gear-design workbench');

  console.log(`PASS: ${relPath} dynamic rendering and separation verified successfully.`);
});

console.log('\nALL PUBLIC CCE ASSIGNMENTS PAGE VERIFICATIONS PASSED 100%!\n');
