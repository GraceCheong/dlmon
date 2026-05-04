const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Simple parser for the courseTemplates.ts file
function getTemplates() {
  const content = fs.readFileSync(path.join(__dirname, '../lib/templates/courseTemplates.ts'), 'utf8');
  // This is a hacky way to get the data without executing TS
  // Since we know the file structure, we can try to extract the COURSE_TEMPLATES array
  // Or better, we just use the data we already know from viewing the file.
  
  // Since I (the AI) have seen the file, I can just hardcode the logic or use a more robust way.
  // Actually, I'll just use a small trick: use eval on the JS-ified version or just regex.
  
  // But wait, I'll just use a simpler approach: 
  // I'll write the data into a JSON file first.
  return []; // placeholder
}

async function fix() {
  try {
    // I'll just use the titles I saw in the file.
    const templateTitles = [
      '기초 회화: 일상 중국어',
      '영화로 배우는 중국어',
      '비즈니스 중국어',
      '중국 문화 탐구',
      'HSK 시험 대비반'
    ];

    const courses = await prisma.course.findMany({
      include: { curriculumPlan: true }
    });
    
    // We need the ACTUAL templates. I'll just read the file and use a regex to find the sampleWeeks.
    const fileContent = fs.readFileSync(path.join(__dirname, '../lib/templates/courseTemplates.ts'), 'utf8');

    for (const c of courses) {
      if (c.curriculumPlan) {
        const data = JSON.parse(c.curriculumPlan.data);
        const hasFallback = data.some(d => d.topic.includes('주차 수업'));
        
        if (hasFallback) {
          console.log(`Fixing course: ${c.title}`);
          
          // Find the template block in the file string
          const titleEscaped = c.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const templateRegex = new RegExp(`titleKo:\\s*['"]${titleEscaped}['"][\\s\\S]+?sampleWeeks:\\s*\\[([\\s\\S]+?)\\n\\s{4}\\],`, 'm');
          const match = fileContent.match(templateRegex);
          
          if (match) {
            console.log(`  Found template in file for: ${c.title}`);
            const sampleWeeksStr = match[1];
            // Extremely hacky parse of the sampleWeeks array string
            const weeks = [];
            const weekRegex = /\{ week: (\d+), topic: ['"](.+?)['"], objectives: ['"](.+?)['"], activities: ['"](.+?)['"], assessment: ['"](.+?)['"] \}/g;
            let wMatch;
            while ((wMatch = weekRegex.exec(sampleWeeksStr)) !== null) {
              weeks.push({
                week: parseInt(wMatch[1]),
                topic: wMatch[2],
                objectives: wMatch[3],
                activities: wMatch[4],
                assessment: wMatch[5]
              });
            }
            
            if (weeks.length > 0) {
              const fullCurriculum = Array.from({ length: c.weeks }, (_, i) => {
                const w = i + 1;
                const sample = weeks.find(s => s.week === w);
                if (sample) return sample;
                return {
                  week: w,
                  topic: `${w}주차 수업 (자동 생성)`,
                  objectives: `${c.title} ${w}주차 학습 목표`,
                  activities: '강의 및 연습 활동',
                  assessment: '주간 과제',
                };
              });
              
              await prisma.curriculumPlan.update({
                where: { id: c.curriculumPlan.id },
                data: { data: JSON.stringify(fullCurriculum) }
              });
              console.log(`  Updated ${c.title} with ${weeks.length} real weeks.`);
            }
          } else {
            console.log(`  Could not find template data in file for: ${c.title}`);
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
