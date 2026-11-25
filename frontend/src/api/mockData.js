/**
 * In-memory / persistent seed database for Conferly.
 * Synchronized with localStorage.
 * Deadlines are stored as date-only strings (YYYY-MM-DD).
 */

const STORAGE_KEY = 'conferly_database_v2';

// Date helper to get YYYY-MM-DD offset from today
const getDateOffset = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getInitialSeed = () => {
  const today = getDateOffset(0); // Today (closing tonight at 23:59:59 -> Approaching <=24h)
  const nextWeek = getDateOffset(7); // Next week (Active)
  const twoWeeks = getDateOffset(14); // 2 weeks (Active)
  const pastDate = getDateOffset(-3); // 3 days ago (Expired)

  return {
    sections: [
      { id: 'sec-1', academicYear: '2025-2026', sectionName: 'CSE-A', status: 'Active', createdAt: '2025-06-15' },
      { id: 'sec-2', academicYear: '2025-2026', sectionName: 'CSE-B', status: 'Active', createdAt: '2025-06-15' },
      { id: 'sec-3', academicYear: '2025-2026', sectionName: 'AIML-A', status: 'Active', createdAt: '2025-06-16' },
      { id: 'sec-4', academicYear: '2025-2026', sectionName: 'ECE-A', status: 'Active', createdAt: '2025-06-16' },
      { id: 'sec-5', academicYear: '2026-2027', sectionName: 'IT-A', status: 'Inactive', createdAt: '2026-01-10' },
    ],
    academicYears: [
      { id: 'ay-1', year: '2025-2026', status: 'Active', totalSections: 4, totalStudents: 5 },
      { id: 'ay-2', year: '2026-2027', status: 'Inactive', totalSections: 1, totalStudents: 0 },
      { id: 'ay-3', year: '2024-2025', status: 'Inactive', totalSections: 0, totalStudents: 0 },
    ],
    coordinators: [
      {
        id: 'coord-1',
        name: 'Dr. Sarah Jenkins',
        email: 'sarah.jenkins@college.edu',
        assignedSections: ['CSE-A', 'CSE-B'],
        status: 'Active',
        createdAt: '2025-06-10',
      },
      {
        id: 'coord-2',
        name: 'Prof. Rajesh Kumar',
        email: 'rajesh.kumar@college.edu',
        assignedSections: ['ECE-A'],
        status: 'Active',
        createdAt: '2025-06-12',
      },
      {
        id: 'coord-3',
        name: 'Dr. Anita Roy',
        email: 'anita.roy@college.edu',
        assignedSections: ['AIML-A'],
        status: 'Active',
        createdAt: '2025-06-14',
      },
    ],
    students: [
      {
        id: 'stu-1',
        rollNumber: '23C524',
        name: 'Bala Rajashekar',
        email: '23c524@college.edu',
        phoneNumber: '9876543210',
        academicYear: '2025-2026',
        section: 'CSE-A',
        status: 'Active',
        createdAt: '2025-07-01',
      },
      {
        id: 'stu-2',
        rollNumber: '23C525',
        name: 'Ananya Sharma',
        email: '23c525@college.edu',
        phoneNumber: '9876543211',
        academicYear: '2025-2026',
        section: 'CSE-A',
        status: 'Active',
        createdAt: '2025-07-01',
      },
      {
        id: 'stu-3',
        rollNumber: '23C526',
        name: 'Karthik Verma',
        email: '23c526@college.edu',
        phoneNumber: '9876543212',
        academicYear: '2025-2026',
        section: 'CSE-B',
        status: 'Active',
        createdAt: '2025-07-01',
      },
      {
        id: 'stu-4',
        rollNumber: '23C527',
        name: 'Sneha Reddy',
        email: '23c527@college.edu',
        phoneNumber: '9876543213',
        academicYear: '2025-2026',
        section: 'AIML-A',
        status: 'Active',
        createdAt: '2025-07-01',
      },
      {
        id: 'stu-5',
        rollNumber: '23C528',
        name: 'Rohan Das',
        email: '23c528@college.edu',
        phoneNumber: '9876543214',
        academicYear: '2025-2026',
        section: 'ECE-A',
        status: 'Active',
        createdAt: '2025-07-01',
      },
    ],
    conferences: [
      {
        id: 'conf-1',
        fullName: 'International Conference on Machine Learning and Data Engineering',
        shortName: 'ICMLDE 2026',
        applicationLink: 'https://cmt3.research.microsoft.com/ICMLDE2026',
        deadline: today, // Closing today (active today, approaching <=24h)
        createdBy: 'Admin (System)',
        creatorRole: 'admin',
        createdAt: '2026-08-01',
        scope: 'global',
        status: 'Active',
      },
      {
        id: 'conf-2',
        fullName: 'IEEE International Conference on Advanced Computing & Communications',
        shortName: 'ADCOM 2026',
        applicationLink: 'https://cmt3.research.microsoft.com/ADCOM2026',
        deadline: nextWeek,
        createdBy: 'Dr. Sarah Jenkins',
        creatorRole: 'coordinator',
        createdAt: '2026-08-10',
        scope: 'targeted',
        targetSections: ['CSE-A', 'CSE-B'],
        status: 'Active',
      },
      {
        id: 'conf-3',
        fullName: 'ACM Symposium on Artificial Intelligence and Robotics',
        shortName: 'AIR 2026',
        applicationLink: 'https://cmt3.research.microsoft.com/AIR2026',
        deadline: twoWeeks,
        createdBy: 'Admin (System)',
        creatorRole: 'admin',
        createdAt: '2026-08-12',
        scope: 'global',
        status: 'Active',
      },
      {
        id: 'conf-4',
        fullName: 'International Symposium on Cloud Computing and Cybersecurity',
        shortName: 'ISCCC 2026',
        applicationLink: 'https://cmt3.research.microsoft.com/ISCCC2026',
        deadline: pastDate, // Expired
        createdBy: 'Admin (System)',
        creatorRole: 'admin',
        createdAt: '2026-07-01',
        scope: 'global',
        status: 'Expired',
      },
    ],
    applications: [
      {
        id: 'app-1',
        conferenceId: 'conf-2',
        studentId: 'stu-1',
        rollNumber: '23C524',
        studentName: 'Bala Rajashekar',
        section: 'CSE-A',
        status: 'Applied',
        appliedAt: '2026-08-15',
        screenshotProof: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        proofFileName: 'cmt_submission_receipt_23c524.png',
      },
      {
        id: 'app-2',
        conferenceId: 'conf-1',
        studentId: 'stu-2',
        rollNumber: '23C525',
        studentName: 'Ananya Sharma',
        section: 'CSE-A',
        status: 'Applied',
        appliedAt: '2026-08-18',
        screenshotProof: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        proofFileName: 'ananya_icmlde_proof.png',
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        conferenceId: 'conf-1',
        conferenceName: 'ICMLDE 2026',
        fullName: 'International Conference on Machine Learning and Data Engineering',
        deadline: today,
        createdAt: new Date().toISOString(),
        read: false,
      },
    ],
  };
};

export const getDB = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    // Guarantee all collections exist
    const initial = getInitialSeed();
    return {
      sections: Array.isArray(parsed.sections) ? parsed.sections : initial.sections,
      academicYears: Array.isArray(parsed.academicYears) ? parsed.academicYears : initial.academicYears,
      coordinators: Array.isArray(parsed.coordinators) ? parsed.coordinators : initial.coordinators,
      students: Array.isArray(parsed.students) ? parsed.students : initial.students,
      conferences: Array.isArray(parsed.conferences) ? parsed.conferences : initial.conferences,
      applications: Array.isArray(parsed.applications) ? parsed.applications : initial.applications,
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : initial.notifications,
    };
  } catch (e) {
    console.error('Error reading Conferly database:', e);
    const initial = getInitialSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveDB = (db) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Error saving Conferly database:', e);
  }
};
