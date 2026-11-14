/**
 * Mock data generator for DEMO MODE.
 * The shape of every record mirrors the PostgreSQL schema in
 * `supabase/migrations/001_schema.sql` so the UI can switch to real
 * Supabase queries with minimal changes.
 *
 * Data is deterministic (seeded PRNG) so every reload shows the same dataset.
 */
import { mulberry32, daysFromNow } from '../lib/utils.js'

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishan',
  'Rohan', 'Kabir', 'Ananya', 'Diya', 'Aadhya', 'Myra', 'Sara', 'Ira',
  'Priya', 'Kavya', 'Anika', 'Tanvi', 'Ritika', 'Farhan', 'Imran', 'Zoya',
  'Dev', 'Mehak', 'Laksh', 'Naina', 'Yash', 'Simran',
]
const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Mishra', 'Jain',
  'Agarwal', 'Dubey', 'Choudhary', 'Yadav', 'Nair', 'Iyer', 'Reddy', 'Das',
]
const CITIES = ['Patna', 'Delhi', 'Mumbai', 'Bengaluru', 'Lucknow', 'Ranchi', 'Jaipur', 'Kolkata']

const SUBJECT_TOPICS = {
  'AI & Data': ['AI fundamentals', 'Machine learning basics', 'Deep learning intro', 'NLP & LLMs', 'Data analysis', 'SQL & databases', 'Statistics for data', 'Visualisation', 'Prompt engineering', 'AI ethics'],
  'Web Development': ['HTML & CSS', 'JavaScript ES6+', 'React basics', 'Node.js APIs', 'Responsive design', 'Web security', 'Databases', 'Deployment', 'REST & GraphQL'],
  Programming: ['Language fundamentals', 'Data structures', 'Algorithms', 'OOP concepts', 'Version control', 'Debugging', 'Functional patterns', 'Testing basics', 'Type safety'],
  'Cloud & DevOps': ['Cloud fundamentals', 'AWS services', 'Docker & containers', 'Kubernetes', 'CI/CD pipelines', 'Monitoring', 'Infrastructure as code', 'Serverless', 'Networking in cloud'],
  'Cyber Security': ['Security fundamentals', 'Network security', 'Linux security', 'Web app security', 'Ethical hacking', 'Penetration testing', 'Cryptography', 'Incident response', 'Compliance'],
  Networking: ['TCP/IP model', 'Routing & switching', 'IP addressing', 'Network protocols', 'LAN/WAN', 'Wireless', 'Troubleshooting', 'Network automation', 'VLANs'],
  Design: ['Design fundamentals', 'Color theory', 'Typography', 'Figma basics', 'Wireframing', 'Prototyping', 'UI components', 'UX research', 'Design systems'],
  'Digital Marketing': ['SEO', 'Content marketing', 'Social media', 'Email marketing', 'Paid ads', 'Analytics', 'Conversion optimisation', 'Branding', 'Growth strategy'],
  'Business Software': ['Tally Prime', 'GST filing', 'Accounting basics', 'Invoicing', 'Inventory', 'Payroll', 'Financial reports', 'Reconciliation', 'Compliance'],
}

const COVERS = [
  { emoji: '🤖', from: '#12233F', to: '#4672B8' },
  { emoji: '💻', from: '#312E81', to: '#6366F1' },
  { emoji: '🌐', from: '#1E3A5F', to: '#3B82F6' },
  { emoji: '☁️', from: '#0F2A44', to: '#0EA5E9' },
  { emoji: '🛡️', from: '#111827', to: '#6366F1' },
  { emoji: '📡', from: '#1B325F', to: '#818CF8' },
  { emoji: '🎨', from: '#14213D', to: '#4F46E5' },
  { emoji: '📈', from: '#0B1F3A', to: '#345A99' },
  { emoji: '🧾', from: '#172554', to: '#4F46E5' },
  { emoji: '🗄️', from: '#1E293B', to: '#4672B8' },
]

export function buildDemoDB() {
  const rnd = mulberry32(20261017)
  const ri = (min, max) => Math.floor(rnd() * (max - min + 1)) + min
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
  const chance = (p) => rnd() < p

  /* ---------------- Users (demo auth accounts) ---------------- */
  const users = [
    { id: 'usr-admin', email: 'admin@techtians.com', password: 'Admin@12345', role: 'admin', profileId: 'adm-001' },
    { id: 'usr-teacher', email: 'meera.rao@techtians.com', password: 'Teacher@12345', role: 'teacher', profileId: 'tch-001' },
    { id: 'usr-student', email: 'rohan.verma@techtians.com', password: 'Student@12345', role: 'student', profileId: 'stu-1001' },
  ]

  /* ---------------- Subjects ---------------- */
  const subjectNames = [
    'AI & Data', 'Web Development', 'Programming', 'Cloud & DevOps', 'Cyber Security',
    'Networking', 'Design', 'Digital Marketing', 'Business Software',
  ]
  const subjects = subjectNames.map((name, i) => ({
    id: `sub-${String(i + 1).padStart(2, '0')}`,
    name,
    code: name.slice(0, 4).toUpperCase(),
    color: ['#4672B8', '#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'][i],
    description: `${name} courses with hands-on technology projects and job-ready skills.`,
  }))

  /* ---------------- Teachers ---------------- */
  const teacherDefs = [
    { id: 'tch-001', name: 'Dr. Meera Rao', subject: 'AI & Data', qual: 'Ph.D. Computer Science, IIT Delhi', status: 'active', rating: 4.8 },
    { id: 'tch-002', name: 'Prof. Arjun Deshpande', subject: 'Web Development', qual: 'M.Tech CSE, BITS Pilani', status: 'active', rating: 4.7 },
    { id: 'tch-003', name: 'Dr. Kavita Menon', subject: 'Programming', qual: 'Ph.D. Software Engineering, IISc', status: 'active', rating: 4.9 },
    { id: 'tch-004', name: 'Er. Rajiv Nair', subject: 'Cloud & DevOps', qual: 'B.Tech CSE, NIT Calicut', status: 'active', rating: 4.6 },
    { id: 'tch-005', name: 'Ms. Tanvi Iyer', subject: 'Cyber Security', qual: 'M.Tech Information Security, IIT Bombay', status: 'active', rating: 4.7 },
    { id: 'tch-006', name: 'Mr. Farhan Ali', subject: 'Networking', qual: 'CCNP, Cisco Academy', status: 'active', rating: 4.5 },
    { id: 'tch-007', name: 'Dr. Sneha Bose', subject: 'Design', qual: 'M.Des Interaction Design, NID', status: 'pending', rating: null },
    { id: 'tch-008', name: 'Mr. Vikram Das', subject: 'Digital Marketing', qual: 'MBA Marketing, IIM Calcutta', status: 'pending', rating: null },
    { id: 'tch-009', name: 'Ms. Pooja Pillai', subject: 'Business Software', qual: 'CMA Intermediate, ICAI', status: 'suspended', rating: 4.1 },
  ]
  const teachers = teacherDefs.map((t, i) => ({
    id: t.id,
    userId: t.id === 'tch-001' ? 'usr-teacher' : t.status === 'active' ? `usr-tch-${i}` : null,
    name: t.name,
    email: t.name.split(' ')[1].toLowerCase().replace('.', '') + '@techtians.com',
    phone: '+91 98' + String(10000000 + ri(1000000, 9999999)),
    subject: t.subject,
    qualification: t.qual,
    bio: `Industry-experienced instructor for ${t.subject} with a track record of job-ready training.`,
    status: t.status,
    rating: t.rating,
    totalStudents: t.status === 'active' ? ri(120, 480) : 0,
    joinedAt: daysFromNow(-ri(60, 700)),
    approvedAt: t.status === 'active' ? daysFromNow(-ri(30, 600)) : null,
    appliedAt: t.status === 'pending' ? daysFromNow(-ri(2, 9)) : null,
  }))

  /* ---------------- Courses ---------------- */
  const courseDefs = [
    { title: 'AI & Machine Learning', cat: 'AI & Data', subject: 'AI & Data', teacher: 'tch-001', price: 14999, hours: 120, months: 6, marketMin: 35000, marketMax: 50000, level: 'Advanced', status: 'published' },
    { title: 'Data Science & Analytics', cat: 'AI & Data', subject: 'AI & Data', teacher: 'tch-001', price: 15999, hours: 120, months: 6, marketMin: 40000, marketMax: 60000, level: 'Advanced', status: 'published' },
    { title: 'Full Stack Web Development', cat: 'Web Development', subject: 'Web Development', teacher: 'tch-002', price: 12999, hours: 140, months: 6, marketMin: 30000, marketMax: 45000, level: 'Advanced', status: 'published' },
    { title: 'Cloud Computing (AWS / Azure)', cat: 'Cloud & DevOps', subject: 'Cloud & DevOps', teacher: 'tch-004', price: 11999, hours: 80, months: 4, marketMin: 25000, marketMax: 40000, level: 'Intermediate', status: 'published' },
    { title: 'Cyber Security & Ethical Hacking', cat: 'Cyber Security', subject: 'Cyber Security', teacher: 'tch-005', price: 14999, hours: 120, months: 6, marketMin: 30000, marketMax: 50000, level: 'Advanced', status: 'published' },
    { title: 'DevOps & Automation', cat: 'Cloud & DevOps', subject: 'Cloud & DevOps', teacher: 'tch-004', price: 15999, hours: 100, months: 5, marketMin: 35000, marketMax: 55000, level: 'Advanced', status: 'published' },
    { title: 'Digital Marketing & SEO Mastery', cat: 'Digital Marketing', subject: 'Digital Marketing', teacher: 'tch-008', price: 6999, hours: 60, months: 3, marketMin: 15000, marketMax: 25000, level: 'Beginner', status: 'published' },
    { title: 'UI/UX Design (Figma & Adobe XD)', cat: 'Design', subject: 'Design', teacher: 'tch-007', price: 8999, hours: 80, months: 4, marketMin: 20000, marketMax: 35000, level: 'Intermediate', status: 'published' },
    { title: 'Prompt Engineering & Generative AI', cat: 'AI & Data', subject: 'AI & Data', teacher: 'tch-001', price: 5999, hours: 40, months: 2, marketMin: 15000, marketMax: 25000, level: 'Beginner', status: 'published' },
    { title: 'Data Analytics (Power BI + SQL)', cat: 'AI & Data', subject: 'AI & Data', teacher: 'tch-001', price: 8999, hours: 60, months: 3, marketMin: 18000, marketMax: 30000, level: 'Intermediate', status: 'published' },
    { title: 'Python Programming Masterclass', cat: 'Programming', subject: 'Programming', teacher: 'tch-003', price: 5999, hours: 60, months: 3, marketMin: 12000, marketMax: 20000, level: 'Beginner', status: 'published' },
    { title: 'Software Testing & QA', cat: 'Programming', subject: 'Programming', teacher: 'tch-003', price: 7999, hours: 60, months: 3, marketMin: 15000, marketMax: 25000, level: 'Intermediate', status: 'published' },
    { title: 'Hardware & Networking (CCNA)', cat: 'Networking', subject: 'Networking', teacher: 'tch-006', price: 6999, hours: 60, months: 3, marketMin: 15000, marketMax: 25000, level: 'Intermediate', status: 'published' },
    { title: 'Advanced Tally Prime & GST Filing', cat: 'Business Software', subject: 'Business Software', teacher: 'tch-009', price: 4999, hours: 60, months: 3, marketMin: 8000, marketMax: 15000, level: 'Beginner', status: 'published' },
  ]
  const courses = courseDefs.map((c, i) => {
    const subject = subjects.find((s) => s.name === c.subject)
    return {
      id: `crs-${String(i + 1).padStart(2, '0')}`,
      title: c.title,
      slug: c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: `A practical ${c.subject} programme with live classes, hands-on projects, labs and job-ready skills.`,
      category: c.cat,
      subjectId: subject.id,
      subjectName: subject.name,
      price: c.price,
      durationHours: c.hours,
      durationMonths: c.months || null,
      marketPriceMin: c.marketMin || null,
      marketPriceMax: c.marketMax || null,
      level: c.level,
      status: c.status, // draft | published | archived | pending_approval
      teacherId: c.teacher,
      coverIndex: i % COVERS.length,
      rating: (4 + rnd()).toFixed(1),
      createdAt: daysFromNow(-ri(90, 500)),
      publishedAt: c.status === 'published' ? daysFromNow(-ri(30, 400)) : null,
    }
  })

  /* ---------------- Sections & lessons ---------------- */
  const sections = []
  const lessons = []
  courses.forEach((course) => {
    const topics = SUBJECT_TOPICS[course.subjectName] || SUBJECT_TOPICS['AI & Data']
    const secCount = 3
    let topicIdx = 0
    for (let s = 1; s <= secCount; s++) {
      const secId = `sec-${course.id.slice(4)}-${s}`
      sections.push({
        id: secId,
        courseId: course.id,
        title: `${['Unit', 'Module', 'Part'][s - 1]} ${s}: ${topics[topicIdx] || 'Topics'} onwards`,
        order: s,
      })
      const lessonCount = ri(4, 5)
      for (let l = 1; l <= lessonCount; l++) {
        const topic = topics[topicIdx++ % topics.length]
        lessons.push({
          id: `les-${course.id.slice(4)}-${s}-${l}`,
          courseId: course.id,
          sectionId: secId,
          title: `${topic} — ${['Core Concepts', 'Problem Solving', 'Advanced Examples', 'Revision & Practice', 'Case Studies'][l % 5]}`,
          type: l % 4 === 0 ? 'document' : 'video',
          durationMin: ri(20, 55),
          videoUrl: l % 4 === 0 ? null : `https://www.youtube.com/watch?v=demo${course.id.slice(4)}${s}${l}`,
          order: l,
          status: course.status === 'published' ? (chance(0.85) ? 'published' : 'draft') : 'draft',
        })
      }
    }
  })

  /* ---------------- Students ---------------- */
  const students = []
  for (let i = 0; i < 26; i++) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
    students.push({
      id: `stu-${1001 + i}`,
      studentId: `STU-24-${String(101 + i)}`,
      userId: `usr-stu-${i}`,
      name,
      email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@student.techtians.in`,
      phone: '+91 9' + String(ri(100000000, 999999999)),
      grade: pick(['Undergraduate', 'Graduate', 'Working Professional', 'Career Switcher']),
      city: pick(CITIES),
      status: chance(0.9) ? 'active' : 'suspended',
      enrolledAt: daysFromNow(-ri(5, 400)),
      lastActiveAt: daysFromNow(-ri(0, 6)),
    })
  }

  /* ---------------- Batches ---------------- */
  const batchDefs = [
    { name: 'AI-ML-2026-A1', course: 'crs-01', status: 'active', capacity: 40, start: -30, end: 330, schedule: 'Mon–Sat, 5:00 PM' },
    { name: 'AI-ML-2026-B2', course: 'crs-01', status: 'upcoming', capacity: 40, start: 14, end: 374, schedule: 'Mon–Sat, 6:30 PM' },
    { name: 'DS-2026-A1', course: 'crs-02', status: 'active', capacity: 35, start: -45, end: 315, schedule: 'Tue–Sun, 4:30 PM' },
    { name: 'FSWD-2026-A1', course: 'crs-03', status: 'active', capacity: 50, start: -20, end: 340, schedule: 'Mon–Fri, 7:00 PM' },
    { name: 'CLD-2026-A1', course: 'crs-04', status: 'active', capacity: 45, start: -38, end: 322, schedule: 'Mon–Sat, 5:30 PM' },
    { name: 'SEC-2026-A1', course: 'crs-05', status: 'active', capacity: 30, start: -12, end: 348, schedule: 'Wed–Sun, 6:00 PM' },
    { name: 'DEVOPS-2026-A1', course: 'crs-06', status: 'completed', capacity: 60, start: -200, end: -40, schedule: 'Mon–Fri, 8:00 PM' },
    { name: 'DM-2026-A1', course: 'crs-07', status: 'upcoming', capacity: 40, start: 21, end: 381, schedule: 'Tue–Sat, 5:00 PM' },
    { name: 'PY-2026-A1', course: 'crs-11', status: 'active', capacity: 25, start: -25, end: 335, schedule: 'Sat–Sun, 10:00 AM' },
  ]
  const batches = batchDefs.map((b, i) => ({
    id: `bat-${String(i + 1).padStart(2, '0')}`,
    name: b.name,
    courseId: b.course,
    teacherId: courses.find((c) => c.id === b.course).teacherId,
    startDate: daysFromNow(b.start),
    endDate: daysFromNow(b.end),
    capacity: b.capacity,
    schedule: b.schedule,
    fee: courses.find((c) => c.id === b.course).price,
    status: b.status,
    createdAt: daysFromNow(b.start - 20),
  }))

  /* ---------------- Teacher-course assignments ---------------- */
  const teacherCourses = []
  courses.forEach((c) => {
    teacherCourses.push({ id: `tc-${c.id}-${c.teacherId}`, teacherId: c.teacherId, courseId: c.id, role: 'owner', assignedAt: c.createdAt })
  })
  // assistants for a couple of courses
  teacherCourses.push({ id: 'tc-crs-01-tch-002', teacherId: 'tch-002', courseId: 'crs-01', role: 'assistant', assignedAt: daysFromNow(-100) })
  teacherCourses.push({ id: 'tc-crs-04-tch-001', teacherId: 'tch-001', courseId: 'crs-04', role: 'assistant', assignedAt: daysFromNow(-80) })

  /* ---------------- Enrollments & batch membership ---------------- */
  const enrollments = []
  const batchStudents = []
  const usedStudentCourses = new Set()
  batches.forEach((b) => {
    if (b.status === 'upcoming') return
    const count = Math.round(b.capacity * (0.55 + rnd() * 0.3))
    const shuffled = [...students].sort(() => rnd() - 0.5).slice(0, count)
    shuffled.forEach((st) => {
      const key = `${st.id}|${b.courseId}`
      if (!usedStudentCourses.has(key)) {
        usedStudentCourses.add(key)
        enrollments.push({
          id: `enr-${enrollments.length + 1}`,
          studentId: st.id,
          courseId: b.courseId,
          batchId: b.id,
          enrolledAt: daysFromNow(-ri(2, 60)),
          status: 'active',
          source: chance(0.25) ? 'coupon' : 'direct',
          amountPaid: courses.find((c) => c.id === b.courseId).price,
        })
      }
      batchStudents.push({ id: `bs-${batchStudents.length + 1}`, batchId: b.id, studentId: st.id, enrolledAt: daysFromNow(-ri(2, 60)), status: 'active' })
    })
  })
  // extra direct course enrollments without batches
  students.forEach((st) => {
    const extra = ri(1, 2)
    for (let k = 0; k < extra; k++) {
      const c = pick(courses.filter((c) => c.status === 'published'))
      const key = `${st.id}|${c.id}`
      if (!usedStudentCourses.has(key)) {
        usedStudentCourses.add(key)
        enrollments.push({
          id: `enr-${enrollments.length + 1}`,
          studentId: st.id,
          courseId: c.id,
          batchId: null,
          enrolledAt: daysFromNow(-ri(5, 300)),
          status: chance(0.9) ? 'active' : 'completed',
          source: 'direct',
          amountPaid: c.price,
        })
      }
    }
  })
  // attach progress to enrollments
  enrollments.forEach((e) => {
    const courseLessons = lessons.filter((l) => l.courseId === e.courseId)
    const done = courseLessons.filter(() => chance(0.55)).length
    e.progressPct = courseLessons.length ? Math.round((done / courseLessons.length) * 100) : 0
  })

  /* ---------------- Lesson progress ---------------- */
  const lessonProgress = []
  enrollments.forEach((e) => {
    lessons.filter((l) => l.courseId === e.courseId).forEach((l) => {
      if (chance(0.5)) {
        lessonProgress.push({
          id: `lp-${lessonProgress.length + 1}`,
          studentId: e.studentId,
          lessonId: l.id,
          courseId: e.courseId,
          status: chance(0.8) ? 'completed' : 'in_progress',
          pct: ri(30, 100),
          completedAt: daysFromNow(-ri(0, 40)),
        })
      }
    })
  })

  /* ---------------- Live classes ---------------- */
  const liveClassTitles = ['Problem Solving Marathon', 'Doubt Clearing Session', 'Unit Test Review', 'Concept Deep Dive', 'Revision Crash Session', 'Weekly Masterclass']
  const liveClasses = []
  const activeBatches = batches.filter((b) => b.status === 'active')
  for (let i = 0; i < 14; i++) {
    const b = pick(activeBatches)
    const dayOffset = i < 5 ? -ri(1, 18) : i < 7 ? 0 : ri(1, 12)
    liveClasses.push({
      id: `lvc-${String(i + 1).padStart(2, '0')}`,
      courseId: b.courseId,
      batchId: b.id,
      teacherId: b.teacherId,
      title: `${courses.find((c) => c.id === b.courseId).subjectName} ${pick(liveClassTitles)}`,
      scheduledAt: daysFromNow(dayOffset, ri(9, 19), pick([0, 30])),
      durationMin: pick([60, 90, 120]),
      meetingUrl: 'https://meet.google.com/' + b.name.toLowerCase() + '-' + i,
      status: dayOffset < 0 ? (chance(0.9) ? 'completed' : 'cancelled') : i === 6 ? 'live' : 'upcoming',
      createdBy: 'adm-001',
      createdAt: daysFromNow(-ri(1, 30)),
    })
  }

  /* ---------------- Recorded lectures (video hosted externally) ---------------- */
  const lectures = []
  lessons.filter((l) => l.type === 'video').forEach((l) => {
    if (!chance(0.6)) return
    const sec = sections.find((s) => s.id === l.sectionId)
    const batch = batches.find((b) => b.courseId === l.courseId && b.status === 'active')
    lectures.push({
      id: `lec-${l.id}`,
      courseId: l.courseId,
      sectionId: l.sectionId,
      sectionName: sec ? sec.title : '',
      batchId: batch ? batch.id : null,
      teacherId: courses.find((c) => c.id === l.courseId).teacherId,
      title: l.title,
      description: `Recorded lecture covering ${l.title.split('—')[0].trim()} with worked examples and practice problems.`,
      videoUrl: l.videoUrl,
      durationMin: l.durationMin,
      order: l.order,
      status: l.status === 'published' && chance(0.9) ? 'published' : 'draft',
      uploadedAt: daysFromNow(-ri(2, 120)),
      views: ri(20, 900),
    })
  })

  /* ---------------- Assignments & submissions ---------------- */
  const assignmentDefs = ['Problem Set', 'Worksheet', 'Case Study', 'Lab Report', 'Revision Test', 'Project Work']
  const assignments = []
  const submissions = []
  for (let i = 0; i < 12; i++) {
    const b = pick(activeBatches)
    const due = daysFromNow(pick([-3, -1, 2, 5, 8, 12]))
    const a = {
      id: `asg-${String(i + 1).padStart(2, '0')}`,
      courseId: b.courseId,
      batchId: b.id,
      teacherId: b.teacherId,
      title: `${courses.find((c) => c.id === b.courseId).subjectName} ${pick(assignmentDefs)} ${i + 1}`,
      instructions: 'Solve all questions. Show full working. Submit scanned PDF or typed document before the deadline.',
      dueDate: due,
      maxMarks: pick([20, 25, 40, 50]),
      attachments: chance(0.6) ? [`${pick(['question-paper', 'worksheet', 'reference-notes'])}.pdf`] : [],
      status: 'published',
      createdAt: daysFromNow(-ri(3, 15)),
      resultsPublished: chance(0.5),
    }
    assignments.push(a)
    batchStudents.filter((bs) => bs.batchId === b.id).forEach((bs) => {
      if (!chance(0.65)) return
      const late = chance(0.15)
      const graded = chance(0.6)
      submissions.push({
        id: `sub-${submissions.length + 1}`,
        assignmentId: a.id,
        studentId: bs.studentId,
        submittedAt: daysFromNow(-ri(0, 4)),
        fileName: `${bs.studentId.split('-')[1]}_assignment_${a.id}.pdf`,
        marks: graded ? ri(Math.round(a.maxMarks * 0.4), a.maxMarks) : null,
        feedback: graded ? pick(['Well done. Try harder problems next time.', 'Good effort — review Q4 carefully.', 'Excellent clarity of working.', 'Needs improvement in time management.']) : null,
        status: late ? 'late' : 'submitted',
        published: graded && a.resultsPublished,
      })
    })
  }

  /* ---------------- Quizzes, questions, attempts ---------------- */
  const quizzes = []
  const quizAttempts = []
  for (let q = 0; q < 6; q++) {
    const b = pick(activeBatches)
    const subjectName = courses.find((c) => c.id === b.courseId).subjectName
    const topics = SUBJECT_TOPICS[subjectName] || SUBJECT_TOPICS['AI & Data']
    const questions = Array.from({ length: 5 }, (_, qi) => {
      const correct = ri(0, 3)
      return {
        id: `q-${q}-${qi}`,
        text: `${topics[qi % topics.length]}: sample question ${qi + 1} about key concepts?`,
        options: [
          `Option A for ${topics[qi % topics.length]}`,
          `Option B for ${topics[qi % topics.length]}`,
          `Option C for ${topics[qi % topics.length]}`,
          `Option D for ${topics[qi % topics.length]}`,
        ],
        correctIndex: correct,
        marks: 10,
      }
    })
    const quiz = {
      id: `qz-${String(q + 1).padStart(2, '0')}`,
      courseId: b.courseId,
      batchId: b.id,
      teacherId: b.teacherId,
      title: `${subjectName} Unit Test ${q + 1}`,
      timeLimitMin: pick([15, 20, 30]),
      maxAttempts: 2,
      totalMarks: questions.reduce((s, x) => s + x.marks, 0),
      questions,
      status: 'published',
      resultsPublished: chance(0.6),
      createdAt: daysFromNow(-ri(4, 20)),
    }
    quizzes.push(quiz)
    batchStudents.filter((bs) => bs.batchId === b.id).slice(0, ri(6, 14)).forEach((bs) => {
      const score = ri(Math.round(quiz.totalMarks * 0.4), quiz.totalMarks)
      quizAttempts.push({
        id: `qa-${quizAttempts.length + 1}`,
        quizId: quiz.id,
        studentId: bs.studentId,
        attemptedAt: daysFromNow(-ri(0, 10)),
        score,
        maxScore: quiz.totalMarks,
        status: 'completed',
        published: quiz.resultsPublished,
      })
    })
  }

  /* ---------------- Announcements ---------------- */
  const announcements = [
    { id: 'ann-1', title: 'Project showcase scheduled', body: 'Live project demos for all AI & Web batches begin next week. Check the batch calendar and submit your builds.', audience: 'all', batchId: null, createdBy: 'adm-001', createdAt: daysFromNow(-1), pinned: true },
    { id: 'ann-2', title: 'New recorded lectures uploaded', body: 'The Machine Learning and Cloud modules are now available in the course library for AI-ML-2026-A1.', audience: 'students', batchId: 'bat-01', createdBy: 'tch-001', createdAt: daysFromNow(-2), pinned: false },
    { id: 'ann-3', title: 'Instructors: submit grade sheets by Friday', body: 'Please ensure all pending project grades are entered before the Friday deadline.', audience: 'teachers', batchId: null, createdBy: 'adm-001', createdAt: daysFromNow(-3), pinned: false },
    { id: 'ann-4', title: 'Festive discount — TTA20', body: 'Use coupon TTA20 for 20% off on all technology courses this month.', audience: 'all', batchId: null, createdBy: 'adm-001', createdAt: daysFromNow(-5), pinned: false },
    { id: 'ann-5', title: 'Lab session moved to Sunday', body: 'The Cloud batch lab session this week moves to Sunday 11 AM due to a holiday.', audience: 'students', batchId: 'bat-06', createdBy: 'tch-004', createdAt: daysFromNow(-4), pinned: false },
    { id: 'ann-6', title: 'Masterclass on careers in tech', body: 'A free careers masterclass for all students is now open for booking.', audience: 'all', batchId: null, createdBy: 'adm-001', createdAt: daysFromNow(-7), pinned: false },
  ]

  /* ---------------- Coupons ---------------- */
  const coupons = [
    { id: 'cpn-1', code: 'TTA20', type: 'percent', value: 20, validFrom: daysFromNow(-10), validTill: daysFromNow(20), maxUses: 500, usedCount: 214, active: true },
    { id: 'cpn-2', code: 'TECH10', type: 'percent', value: 10, validFrom: daysFromNow(-30), validTill: daysFromNow(60), maxUses: 1000, usedCount: 402, active: true },
    { id: 'cpn-3', code: 'AISAVE500', type: 'fixed', value: 500, validFrom: daysFromNow(-15), validTill: daysFromNow(45), maxUses: 200, usedCount: 87, active: true },
    { id: 'cpn-4', code: 'DEVSOUNDLE15', type: 'percent', value: 15, validFrom: daysFromNow(-60), validTill: daysFromNow(30), maxUses: 300, usedCount: 156, active: true },
    { id: 'cpn-5', code: 'WELCOME5', type: 'percent', value: 5, validFrom: daysFromNow(-90), validTill: daysFromNow(90), maxUses: 2000, usedCount: 1103, active: true },
    { id: 'cpn-6', code: 'EXPIRED24', type: 'fixed', value: 250, validFrom: daysFromNow(-90), validTill: daysFromNow(-10), maxUses: 100, usedCount: 64, active: false },
  ]

  /* ---------------- Orders & payments ---------------- */
  const gateways = ['Razorpay', 'PhonePe', 'UPI', 'Card']
  const orders = []
  const payments = []
  const courseIdsPublished = courses.filter((c) => c.status === 'published').map((c) => c.id)
  for (let m = 8; m >= 0; m--) {
    const count = 6 + (8 - m) * 2 + ri(0, 3)
    for (let k = 0; k < count; k++) {
      const course = pick(courseIdsPublished.map((id) => courses.find((c) => c.id === id)))
      const st = pick(students)
      const usedCoupon = chance(0.22) ? pick(coupons.filter((c) => c.active)) : null
      const discount = usedCoupon ? (usedCoupon.type === 'percent' ? (course.price * usedCoupon.value) / 100 : usedCoupon.value) : 0
      const amount = Math.max(99, course.price - discount)
      const statusRoll = rnd()
      const status = statusRoll < 0.82 ? 'paid' : statusRoll < 0.88 ? 'pending' : statusRoll < 0.95 ? 'failed' : 'refunded'
      const oid = `ord-${m}-${k}`
      orders.push({
        id: oid,
        orderId: `ORD-2026-${String(4100 + orders.length)}`,
        studentId: st.id,
        courseId: course.id,
        amount: Math.round(amount),
        discount,
        status,
        couponCode: usedCoupon ? usedCoupon.code : null,
        createdAt: daysFromNow(-(m * 30) - ri(0, 25)),
      })
      payments.push({
        id: `pay-${oid}`,
        orderId: oid,
        amount: Math.round(amount),
        status: status === 'paid' ? 'success' : status === 'pending' ? 'awaiting' : status === 'failed' ? 'failed' : 'refunded',
        gateway: pick(gateways),
        txnId: `txn_${Math.floor(rnd() * 1e10)}`,
        verified: status === 'paid',
        paidAt: status === 'paid' ? daysFromNow(-(m * 30) - ri(0, 25)) : null,
      })
    }
  }

  /* ---------------- Study materials ---------------- */
  const materials = []
  for (let i = 0; i < 12; i++) {
    const c = pick(courses.filter((c) => c.status === 'published'))
    materials.push({
      id: `mat-${String(i + 1).padStart(2, '0')}`,
      teacherId: c.teacherId,
      courseId: c.id,
      title: pick(['Chapter Notes', 'Formula Sheet', 'Practice Worksheet', 'Revision Mind Map', 'Past Papers']) + ` — ${c.subjectName} ${i + 1}`,
      fileName: `${c.subjectName.toLowerCase().replace(' ', '-')}-material-${i + 1}.pdf`,
      fileType: pick(['pdf', 'pdf', 'docx', 'pptx']),
      sizeMB: (ri(3, 240) / 10).toFixed(1),
      uploadedAt: daysFromNow(-ri(1, 90)),
      downloads: ri(10, 600),
    })
  }

  /* ---------------- Attendance ---------------- */
  const attendance = []
  activeBatches.forEach((b) => {
    for (let d = 13; d >= 0; d--) {
      if (chance(0.55)) continue // not every batch meets every day
      batchStudents.filter((bs) => bs.batchId === b.id).forEach((bs) => {
        attendance.push({ id: `att-${attendance.length + 1}`, batchId: b.id, studentId: bs.studentId, date: daysFromNow(-d).slice(0, 10), status: chance(0.86) ? 'present' : 'absent' })
      })
    }
  })

  /* ---------------- Audit logs ---------------- */
  const auditLogs = [
    { id: 'log-1', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'course.published', entity: 'courses', entityId: 'crs-01', details: 'Published "AI & Machine Learning"', createdAt: daysFromNow(-1, 9) },
    { id: 'log-2', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'teacher.approved', entity: 'teachers', entityId: 'tch-004', details: 'Approved teacher application of Er. Rajiv Nair', createdAt: daysFromNow(-1, 11) },
    { id: 'log-3', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'batch.created', entity: 'batches', entityId: 'bat-02', details: 'Created batch AI-ML-2026-B2', createdAt: daysFromNow(-2, 15) },
    { id: 'log-4', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'payment.verified', entity: 'payments', entityId: 'pay-ord-0-1', details: 'Gateway webhook verified payment ORD-2026-4101', createdAt: daysFromNow(-2, 17) },
    { id: 'log-5', actorId: 'usr-teacher', actorName: 'Dr. Meera Rao (Teacher)', action: 'lecture.published', entity: 'lessons', entityId: 'les-01-1-1', details: 'Published lecture "Kinematics — Core Concepts"', createdAt: daysFromNow(-3, 10) },
    { id: 'log-6', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'coupon.created', entity: 'coupons', entityId: 'cpt-1', details: 'Created coupon TTA20 (20%)', createdAt: daysFromNow(-4, 12) },
    { id: 'log-7', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'announcement.posted', entity: 'announcements', entityId: 'ann-1', details: 'Posted announcement to all users', createdAt: daysFromNow(-1, 8) },
    { id: 'log-8', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'student.suspended', entity: 'students', entityId: 'stu-1014', details: 'Suspended account STU-24-114 (policy violation)', createdAt: daysFromNow(-5, 14) },
    { id: 'log-9', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'course.archived', entity: 'courses', entityId: 'crs-12', details: 'Archived "Legacy course"', createdAt: daysFromNow(-6, 16) },
    { id: 'log-10', actorId: 'usr-admin', actorName: 'Aarav Sharma (Admin)', action: 'teacher.rejected', entity: 'teachers', entityId: 'tch-010', details: 'Rejected incomplete application (missing documents)', createdAt: daysFromNow(-7, 13) },
  ]

  /* ---------------- Notifications (topbar) ---------------- */
  const notifications = [
    { id: 'ntf-1', type: 'approval', title: '2 teacher applications pending', body: 'Dr. Sneha Bose and Mr. Vikram Das await review.', time: daysFromNow(0, 8), read: false },
    { id: 'ntf-2', type: 'class', title: 'Live class starts soon', body: 'AI-ML-2026-A1: Live coding session in 1 hour.', time: daysFromNow(0, 9), read: false },
    { id: 'ntf-3', type: 'payment', title: 'Payment failed', body: 'Order ORD-2026-4155 failed at the gateway.', time: daysFromNow(0, 7), read: false },
    { id: 'ntf-4', type: 'enrollment', title: 'New enrollment', body: 'Ananya Iyer enrolled in AI & Machine Learning.', time: daysFromNow(0, 6), read: false },
    { id: 'ntf-5', type: 'submission', title: 'Submissions to grade', body: '14 submissions awaiting review for the Python capstone project.', time: daysFromNow(-1, 18), read: true },
    { id: 'ntf-6', type: 'system', title: 'Weekly report ready', body: 'The academy performance report for this week is available.', time: daysFromNow(-1, 9), read: true },
  ]

  /* ---------------- Platform policies (Settings) ---------------- */
  const policies = {
    teachersCanCreateCourses: true,
    lecturesRequireApproval: false,
    teacherScheduleWindowDays: 14,
    maintenanceMode: false,
  }

  return {
    users, students, teachers, subjects, courses, sections, lessons,
    teacherCourses, batches, batchStudents, enrollments, lessonProgress,
    liveClasses, lectures, assignments, submissions, quizzes, quizAttempts,
    announcements, coupons, orders, payments, materials, attendance,
    auditLogs, notifications, policies,
    covers: COVERS,
  }
}
