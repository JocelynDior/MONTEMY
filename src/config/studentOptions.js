export const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

// Class letters. A grade plus a letter makes a class such as 8C.
export const CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

// The stored values. They stay in English because they are saved on the account and compared by other pages.
export const SUBJECT_OPTIONS = [
  'Mathematics', 'English', 'Science', 'Physical Sciences', 'Life Sciences',
  'Geography', 'History', 'Accounting', 'Business Studies', 'Economics',
  'Computer Science', 'Life Orientation',
]

// The same subjects with the i18n key of their name (words are in i18n/ns/student.js)
export const SUBJECT_ITEMS = [
  { value: 'Mathematics', key: 'student.subj_mathematics' },
  { value: 'English', key: 'student.subj_english' },
  { value: 'Science', key: 'student.subj_science' },
  { value: 'Physical Sciences', key: 'student.subj_physicalSciences' },
  { value: 'Life Sciences', key: 'student.subj_lifeSciences' },
  { value: 'Geography', key: 'student.subj_geography' },
  { value: 'History', key: 'student.subj_history' },
  { value: 'Accounting', key: 'student.subj_accounting' },
  { value: 'Business Studies', key: 'student.subj_businessStudies' },
  { value: 'Economics', key: 'student.subj_economics' },
  { value: 'Computer Science', key: 'student.subj_computerScience' },
  { value: 'Life Orientation', key: 'student.subj_lifeOrientation' },
]

// The subject in the user's language. A subject a person typed themselves is shown as typed.
export function subjectLabel(subject, t) {
  const hit = SUBJECT_ITEMS.find(s => s.value === subject)
  return hit && t ? t(hit.key) : subject
}

// "Grade 8" in the user's language
export const gradeLabel = (grade, t) => (t ? t('student.gradeN', { n: grade }) : `Grade ${grade}`)
