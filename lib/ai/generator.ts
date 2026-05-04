import prisma from '@/lib/prisma';

export interface CourseGenerationParams {
  title: string;
  description: string;
  level: string;
  weeks: number;
  type: string;
  style: string;
  evaluation: string;
  goals: string;
  keywords?: string;
  language?: 'ko' | 'en';
  startDate?: string;
  userId: string;
}

export async function generateCourseCurriculum(params: CourseGenerationParams) {
  const lang = params.language || 'ko';
  
  const curriculumData = generateMockCurriculum(params, lang);
  const syllabusContent = generateMockSyllabus(params, lang);

  const startDate = params.startDate ? new Date(params.startDate) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (params.weeks * 7));

  const course = await prisma.course.create({
    data: {
      title: params.title,
      description: params.description,
      level: params.level,
      type: params.type,
      weeks: params.weeks,
      startDate: startDate,
      endDate: endDate,
      userId: params.userId,
      curriculumPlan: {
        create: {
          data: JSON.stringify(curriculumData)
        }
      },
      syllabus: {
        create: {
          content: syllabusContent
        }
      }
    }
  });

  return course;
}

function generateMockCurriculum(params: CourseGenerationParams, lang: 'ko' | 'en') {
  const weeks = [];
  
  const topicsKo = [
    "인사 및 자기소개",
    "가족과 친구 소개하기",
    "일상 생활과 시간 표현",
    "음식 문화와 레스토랑 주문하기",
    "쇼핑과 취향 표현하기",
    "교통수단과 길 찾기",
    "취미와 여가 활동",
    "건강과 신체 관리",
    "중간 검토 및 문화 체험 활동",
    "여행 계획과 지리적 랜드마크",
    "날씨와 계절별 풍습",
    "중국의 현대 생활과 기술",
    "명절과 전통 가치관",
    "직업과 미래의 꿈",
    "최종 복습 및 발표 준비"
  ];

  const topicsEn = [
    "Introduction and Basic Greetings",
    "Self-Introduction and Family Members",
    "Daily Routine and Time Expressions",
    "Food Culture and Ordering at a Restaurant",
    "Shopping and Expressing Preferences",
    "Transportation and Directions",
    "Hobbies and Leisure Activities",
    "Health and Physical Wellness",
    "Mid-term Review and Cultural Activity",
    "Travel Planning and Geographical Landmarks",
    "Weather and Seasonal Customs",
    "Modern Life and Technology in China",
    "Festivals and Traditional Values",
    "Career and Future Aspirations",
    "Final Review and Presentation Preparation"
  ];

  const topics = lang === 'ko' ? topicsKo : topicsEn;

  for (let i = 1; i <= params.weeks; i++) {
    const topicIndex = (i - 1) % topics.length;
    weeks.push({
      week: i,
      topic: topics[topicIndex],
      objectives: lang === 'ko' 
        ? `${topics[topicIndex]}와 관련된 어휘 및 문법을 마스터합니다.` 
        : `Master vocabulary and grammar related to ${topics[topicIndex]}.`,
      activities: lang === 'ko'
        ? `${topics[topicIndex]}에 관한 역할극, 듣기 연습 및 그룹 토론.`
        : `Role-play, listening exercises, and group discussion about ${topics[topicIndex]}.`,
      assessment: lang === 'ko'
        ? `주간 퀴즈 및 ${topics[topicIndex]}에 대한 짧은 작문 과제.`
        : `Weekly quiz and a short writing assignment on ${topics[topicIndex]}.`
    });
  }
  return weeks;
}

function generateMockSyllabus(params: CourseGenerationParams, lang: 'ko' | 'en') {
  if (lang === 'ko') {
    return `
# 강의 계획서: ${params.title}

## 강좌 개요
${params.description || `이 강좌는 중국어 언어 및 문화를 바탕으로 ${params.type}에 집중하는 ${params.level} 수준의 교육 과정입니다.`}

## 교육 목표
본 과정을 마친 학생들은 다음과 같은 능력을 갖추게 됩니다:
- 주간 주제와 관련된 다양한 사회적 맥락에서 효과적으로 소통할 수 있습니다.
- 기본적인 문화적 뉘앙스와 ${params.type}의 원리를 이해합니다.
- 설정된 교수 목표를 달성합니다: ${params.goals}.

## 교수법
본 강좌는 **${params.style}** 접근 방식을 채택하여, 학생들의 능동적인 참여와 지식의 실제적인 응용을 강조합니다.

## 주간 일정
(세부 주간 일정은 생성된 커리큘럼 계획표를 참조하세요)

## 평가 기준
${params.evaluation || "출석 10%, 참여도 20%, 중간고사 30%, 기말 프로젝트 40%"}

## 기대 학습 효과
학생들은 ${params.level} 수준의 벤치마크에 해당하는 숙달도를 얻게 되며, 중국 ${params.type}에 대한 비판적 이해를 발전시킬 것입니다.
    `;
  }

  return `
# Syllabus: ${params.title}

## Course Overview
${params.description || `This is a ${params.level} level course focusing on ${params.type} in the context of Chinese language and culture.`}

## Course Objectives
By the end of this course, students will be able to:
- Communicate effectively in various social contexts related to the weekly topics.
- Understand fundamental cultural nuances and ${params.type} principles.
- Achieve the set teaching goals: ${params.goals}.

## Teaching Methodology
This course adopts a **${params.style}** approach, emphasizing active participation and practical application of knowledge.

## Weekly Schedule
(See generated curriculum plan for detailed weekly breakdown)

## Evaluation Criteria
${params.evaluation || "Attendance 10%, Participation 20%, Midterm 30%, Final Project 40%"}

## Expected Learning Outcomes
Students will gain proficiency equivalent to the ${params.level} level benchmarks and develop a critical appreciation for Chinese ${params.type}.
  `;
}
