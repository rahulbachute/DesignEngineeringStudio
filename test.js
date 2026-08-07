const fs = require('fs');
fetch('https://script.google.com/macros/s/AKfycbzb7HYaA5WdPWd7ggQ416LHu1KHn27hWgubNmYKpx8aLgfAMY9kSvdMneqT1JCi6fQM/exec', {
  method: 'POST',
  body: JSON.stringify({ action: 'submission', submissionId: 'ec-01-44-20260731083907268' }),
  headers: { 'Content-Type': 'text/plain' }
}).then(r => r.json()).then(json => {
  fs.writeFileSync('submission_detail_attempt1.json', JSON.stringify(json, null, 2));
  console.log('Saved to submission_detail_attempt1.json');
}).catch(e => console.error(e));
