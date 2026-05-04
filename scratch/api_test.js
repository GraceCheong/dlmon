const http = require('http');

async function fetchRoute(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:3000${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING RIGOROUS UI & API TESTS ---');

  // TC1: Assignments Dashboard (GET)
  console.log('\\n[TC1] Fetching Teacher Assignments Dashboard (/assignments)...');
  let res = await fetchRoute('/assignments');
  if (res.status === 200) {
    console.log('✅ SUCCESS: /assignments loaded with HTTP 200 (No 500 errors).');
  } else {
    console.error(`❌ FAILED: /assignments returned HTTP ${res.status}`);
  }

  // TC2: Create Assignment (POST to /api/assignments)
  console.log('\\n[TC2] Creating a New Assignment...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const lesson = await prisma.lesson.findFirst();
  
  res = await fetchRoute('/api/assignments', {
    method: 'POST',
    body: {
      title: 'Rigorous Test Assignment',
      lessonId: lesson.id,
      type: 'writing',
      prompt: 'Please write a 50 word essay in Chinese.',
    }
  });

  let assignmentId;
  if (res.status === 200) {
    const data = JSON.parse(res.data);
    assignmentId = data.id;
    console.log(`✅ SUCCESS: Assignment created! ID: ${assignmentId}`);
  } else {
    console.error(`❌ FAILED: /api/assignments returned HTTP ${res.status}\\n${res.data}`);
    return;
  }

  // TC3: View specific assignment (GET /assignments/[id])
  console.log(`\\n[TC3] Fetching Teacher Assignment Details (/assignments/${assignmentId})...`);
  res = await fetchRoute(`/assignments/${assignmentId}`);
  if (res.status === 200) {
    console.log('✅ SUCCESS: Assignment Details page loaded with HTTP 200.');
  } else {
    console.error(`❌ FAILED: Assignment Details page returned HTTP ${res.status}`);
  }

  // TC4: Student Portal View (GET /student/assignments/[id])
  console.log(`\\n[TC4] Fetching Student Portal (/student/assignments/${assignmentId})...`);
  res = await fetchRoute(`/student/assignments/${assignmentId}`);
  if (res.status === 200) {
    console.log('✅ SUCCESS: Student Portal loaded with HTTP 200.');
  } else {
    console.error(`❌ FAILED: Student Portal returned HTTP ${res.status}`);
  }

  // TC5: Student Submission & AI Grading (POST /api/ai/grade)
  console.log('\\n[TC5] Simulating Student Submission & AI Grading...');
  const member = await prisma.member.findFirst();
  
  res = await fetchRoute('/api/ai/grade', {
    method: 'POST',
    body: {
      assignmentId: assignmentId,
      memberId: member.id,
      content: '你好！我是韩国人。我很高兴。',
      prompt: 'Please write a 50 word essay in Chinese.'
    }
  });

  if (res.status === 200) {
    const data = JSON.parse(res.data);
    console.log(`✅ SUCCESS: AI Grading Complete!`);
    console.log(`   - AI Score: ${data.submission.aiScore}`);
    console.log(`   - AI Feedback: ${data.submission.aiFeedback}`);
  } else {
    console.error(`❌ FAILED: AI Grading returned HTTP ${res.status}\\n${res.data}`);
  }

  // Verification 2: Check DB for the submission
  const submissions = await prisma.submission.findMany({ where: { assignmentId } });
  if (submissions.length === 1 && submissions[0].aiScore) {
    console.log('\\n✅ FINAL VERIFICATION: Submission successfully recorded in the database with AI Score.');
  } else {
    console.error('\\n❌ FINAL VERIFICATION FAILED: Submission not found in database.');
  }

  console.log('\\n--- ALL TESTS COMPLETED ---');
  await prisma.$disconnect();
}

runTests();
