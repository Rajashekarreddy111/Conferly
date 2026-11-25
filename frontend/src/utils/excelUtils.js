import * as XLSX from 'xlsx';

/**
 * Excel templates definitions for Coordinators, Students, and Conferences
 */
export const TEMPLATES = {
  coordinators: {
    columns: ['Coordinator Name', 'Email ID', 'Assigned Sections', 'Initial Password'],
    sampleData: [
      {
        'Coordinator Name': 'Dr. Sarah Jenkins',
        'Email ID': 'sarah.jenkins@college.edu',
        'Assigned Sections': 'CSE-A, CSE-B',
        'Initial Password': 'CoordPass@2026'
      },
      {
        'Coordinator Name': 'Prof. Rajesh Kumar',
        'Email ID': 'rajesh.kumar@college.edu',
        'Assigned Sections': 'ECE-A',
        'Initial Password': 'CoordPass@2026'
      }
    ],
    filename: 'coordinators_import_template.xlsx'
  },
  students: {
    columns: ['Roll Number', 'Student Name', 'Email ID', 'Phone Number', 'Academic Year', 'Section', 'Initial Password'],
    sampleData: [
      {
        'Roll Number': '23C524',
        'Student Name': 'Bala Rajashekar',
        'Email ID': '23c524@college.edu',
        'Phone Number': '9876543210',
        'Academic Year': '2025-2026',
        'Section': 'CSE-A',
        'Initial Password': 'StudentPass@2026'
      },
      {
        'Roll Number': '23C525',
        'Student Name': 'Ananya Sharma',
        'Email ID': '23c525@college.edu',
        'Phone Number': '9876543211',
        'Academic Year': '2025-2026',
        'Section': 'CSE-A',
        'Initial Password': 'StudentPass@2026'
      }
    ],
    filename: 'students_import_template.xlsx'
  },
  conferences: {
    columns: ['Conference Full Name', 'Conference Short Name', 'Application Link', 'Deadline'],
    sampleData: [
      {
        'Conference Full Name': 'International Conference on Machine Learning and Data Engineering',
        'Conference Short Name': 'ICMLDE 2026',
        'Application Link': 'https://cmt3.research.microsoft.com/ICMLDE2026',
        'Deadline': '2026-11-15T23:59:00'
      },
      {
        'Conference Full Name': 'IEEE International Conference on Advanced Computing & Communications',
        'Conference Short Name': 'ADCOM 2026',
        'Application Link': 'https://cmt3.research.microsoft.com/ADCOM2026',
        'Deadline': '2026-11-20T18:00:00'
      }
    ],
    filename: 'conferences_import_template.xlsx'
  }
};

/**
 * Downloads a pre-formatted Excel template with instructions and samples.
 */
export const downloadTemplate = (type) => {
  const template = TEMPLATES[type];
  if (!template) throw new Error(`Unknown template type: ${type}`);

  const ws = XLSX.utils.json_to_sheet(template.sampleData, { header: template.columns });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, template.filename);
};

/**
 * Parses an uploaded Excel or CSV file into an array of objects.
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        resolve(jsonData);
      } catch (err) {
        reject(new Error('Failed to parse file. Please upload a valid .xlsx, .xls or .csv file.'));
      }
    };

    reader.onerror = () => reject(new Error('Error reading file.'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validates rows against requirements and produces row-level error reports.
 */
export const validateImportRows = (rows, type) => {
  const errors = [];
  const validRows = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +2 for 1-indexed and header row
    const rowErrors = [];

    if (type === 'coordinators') {
      const name = String(row['Coordinator Name'] || '').trim();
      const email = String(row['Email ID'] || '').trim();
      const sections = String(row['Assigned Sections'] || '').trim();
      const password = String(row['Initial Password'] || '').trim();

      if (!name) rowErrors.push('Coordinator Name is required');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push('Valid Email ID is required');
      if (!sections) rowErrors.push('Assigned Sections is required (e.g. CSE-A, CSE-B)');
      if (!password || password.length < 6) rowErrors.push('Initial Password is required (min 6 characters)');

      if (rowErrors.length > 0) {
        errors.push({ rowNumber: rowNum, errors: rowErrors, raw: row });
      } else {
        validRows.push({
          name,
          email,
          assignedSections: sections.split(',').map((s) => s.trim()).filter(Boolean),
          initialPassword: password
        });
      }
    } else if (type === 'students') {
      const rollNumber = String(row['Roll Number'] || '').trim();
      const studentName = String(row['Student Name'] || '').trim();
      const email = String(row['Email ID'] || '').trim();
      const phone = String(row['Phone Number'] || '').trim();
      const academicYear = String(row['Academic Year'] || '').trim();
      const section = String(row['Section'] || '').trim();
      const password = String(row['Initial Password'] || '').trim();

      if (!rollNumber) rowErrors.push('Roll Number is required');
      if (!studentName) rowErrors.push('Student Name is required');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push('Valid Email ID is required');
      if (!phone || phone.length < 10) rowErrors.push('Valid 10-digit Phone Number is required');
      if (!academicYear) rowErrors.push('Academic Year is required (e.g. 2025-2026)');
      if (!section) rowErrors.push('Section is required');
      if (!password || password.length < 6) rowErrors.push('Initial Password is required (min 6 characters)');

      if (rowErrors.length > 0) {
        errors.push({ rowNumber: rowNum, errors: rowErrors, raw: row });
      } else {
        validRows.push({
          rollNumber,
          studentName,
          email,
          phoneNumber: phone,
          academicYear,
          section,
          initialPassword: password
        });
      }
    } else if (type === 'conferences') {
      const fullName = String(row['Conference Full Name'] || '').trim();
      const shortName = String(row['Conference Short Name'] || '').trim();
      const applicationLink = String(row['Application Link'] || '').trim();
      const deadline = String(row['Deadline'] || '').trim();

      if (!fullName) rowErrors.push('Conference Full Name is required');
      if (!shortName) rowErrors.push('Conference Short Name is required');
      if (!applicationLink || !/^https?:\/\/.+/.test(applicationLink)) rowErrors.push('Valid Application URL starting with http:// or https:// is required');
      if (!deadline || isNaN(new Date(deadline).getTime())) rowErrors.push('Valid Deadline (YYYY-MM-DDTHH:MM) is required');

      if (rowErrors.length > 0) {
        errors.push({ rowNumber: rowNum, errors: rowErrors, raw: row });
      } else {
        validRows.push({
          fullName,
          shortName,
          applicationLink,
          deadline: new Date(deadline).toISOString()
        });
      }
    }
  });

  return { validRows, errors };
};

/**
 * Exports JSON data to an Excel file download
 */
export const exportToExcel = (data, filename = 'report.xlsx', sheetName = 'Report') => {
  if (!data || !data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};
