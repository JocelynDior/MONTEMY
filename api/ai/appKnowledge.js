// A written guide to the whole app. The Help assistant reads it on every chat.
// UPDATE THIS FILE whenever a feature, circle, screen or setting changes.

// The 33 app languages. code, English name, native name, right-to-left flag.
const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'zh', name: 'Mandarin Chinese (Simplified)', native: '简体中文' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'pcm', name: 'Nigerian Pidgin', native: 'Naijá' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'yue', name: 'Cantonese (Traditional)', native: '粵語' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'wuu', name: 'Wu Chinese (written in Simplified Chinese)', native: '吴语' },
  { code: 'fil', name: 'Filipino (Tagalog)', native: 'Filipino' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'arz', name: 'Egyptian Arabic (written in Modern Standard Arabic)', native: 'مصرى', rtl: true },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'jv', name: 'Javanese', native: 'Basa Jawa' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pa', name: 'Punjabi (Gurmukhi script)', native: 'ਪੰਜਾਬੀ' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
  { code: 'zu', name: 'isiZulu', native: 'isiZulu' },
  { code: 'xh', name: 'isiXhosa', native: 'isiXhosa' },
]

const LANGUAGE_CODES = LANGUAGES.map(l => l.code)
const languageName = (code) => (LANGUAGES.find(l => l.code === code) || LANGUAGES[0]).name

// Pages the assistant may guide a user to. The browser turns a page key into a route.
// Each role only gets the keys listed for it (see PAGES_BY_ROLE).
const PAGE_KEYS = [
  'home', 'settings', 'help', 'messages', 'events', 'calendar', 'timetable', 'textbooks',
  'profile', 'privacy', 'terms', 'more_info', 'ai_tutor', 'homework', 'exams', 'subjects',
  'progress', 'classes', 'staff', 'parents', 'students', 'sessions', 'learning_plans',
  'school_statistics', 'billing', 'student_progress', 'users', 'organisations',
  'school_management', 'pending_verification', 'broadcast', 'parent_teacher', 'branding',
  'platform_statistics',
]

const COMMON_PAGES = ['home', 'settings', 'help', 'messages', 'events', 'calendar', 'profile', 'privacy', 'terms', 'more_info']
const PAGES_BY_ROLE = {
  student: [...COMMON_PAGES, 'ai_tutor', 'homework', 'timetable', 'textbooks', 'exams', 'subjects', 'progress'],
  teacher: [...COMMON_PAGES, 'classes', 'homework', 'progress', 'timetable', 'textbooks', 'staff', 'parents'],
  tutor: [...COMMON_PAGES, 'students', 'sessions', 'learning_plans', 'progress', 'textbooks'],
  parent: [...COMMON_PAGES, 'progress', 'homework', 'timetable', 'exams'],
  principal: [...COMMON_PAGES, 'school_statistics', 'billing', 'student_progress', 'staff', 'parents'],
  staff: [...COMMON_PAGES, 'staff'],
  admin: [...COMMON_PAGES, 'users', 'classes', 'organisations', 'school_management', 'pending_verification',
    'broadcast', 'parent_teacher', 'branding', 'textbooks', 'platform_statistics', 'billing'],
}

const APP_GUIDE = `
ABOUT MONTEMY
Montemy is an education app for schools and tutor firms. People sign up as a Student, Teacher, Tutor, Parent, Principal or Staff Member. An admin verifies new accounts. Until an account is verified, some features show a lock and open the verification page.
In a tutor firm the organisation is called a Firm. In a school it is called a School. Use the word that matches the user's organisation.

THE APP FRAME (same for every role)
- Top bar: notification bell on the left, the School or Firm name in the middle, menu icon (three lines) on the right.
- Menu: profile picture with the name and role at the top, then every feature the user has, then Settings, Help, Privacy Policy, Terms and Conditions, More Info and Log Out. The last line is Home Features, followed by the home circles.
- Slideshow: a banner under the top bar showing the school's slides, with the school logo at its bottom-left corner.
- Home circles: a grid of 2 columns of round buttons. Each circle opens one feature. The page scrolls down when there are many circles.
- Bottom bar (every role except Staff Member): Messages, School Events, Settings and Profile.

HOME CIRCLES PER ROLE
- Student: AI Tutor, Homework, Timetable, Textbooks, Exams, My Subjects, Progress, Calendar, Help.
- Teacher: Classes, Homework, Progress, Timetable, Textbooks, Staff, Parents, Calendar, Help.
- Tutor: Students, Sessions, Learning Plans, Progress, Textbooks, Calendar, Help.
- Parent: Child Progress, Homework, Timetable, Exams, Calendar, Help.
- Principal: School Statistics, Billing, Student Progress, Staff, Parents, Calendar, Help.
- Staff Member: Messages, School Events, Profile, Staff, Calendar, Help. Staff Members have no bottom bar.
- Admin: Users, Classes, Organisations, School Management, Pending Verification, Broadcast, Parent-Teacher, Branding, Textbooks, Platform Statistics, Billing, Calendar, Help.

SETTINGS (open from the bottom bar or the menu)
- Appearance: Dark, Light or Default. Default follows the phone's own light or dark setting.
- Language: 33 languages. The app and this assistant switch to the chosen language.
- Session: Stay logged in, or Log in every time.
- Profile: name, bio and a profile picture chosen from 10 avatars. Photos cannot be uploaded.
- Notifications: choose which kinds of notification to receive.
- Linked parents (students only): approve or reject requests from parents who want to follow the student's progress.
- Delete account.

FEATURES
- AI Tutor (students): a patient tutor that gives hints and worked examples instead of final homework answers. It answers in the user's language.
- Homework: teachers set assignments for a class; students open them, upload files and see feedback. Parents can see their child's homework, due dates and status.
- Timetable: the weekly lesson timetable. Teachers and the principal manage it; students see their own; parents see their child's (read only).
- Textbooks: study materials uploaded by teachers and admins (PDF, Word, PowerPoint, images, up to 10 MB). Students, teachers and tutors can read them.
- Exams: teachers create exams for a class (date, time, venue, total marks) and enter marks. Students and linked parents see upcoming exams and results.
- Progress: marks and trends. Parents see Child Progress with a risk level. Tutors write Progress Reports (a summary and a 1 to 5 rating per period).
- Learning Plans (tutors): goals per student with a status and a due date.
- Sessions and Students (tutors): book tutoring sessions and see the tutor's students.
- Messages: private conversations between people who are allowed to message each other. Staff and Parents group chats are used by principals, teachers and staff (Staff chat) and by parents, teachers and the principal (Parents chat).
- School Events and Calendar: events set by the principal or admin. Everyone can see the calendar and say whether they can come. A reminder goes out the day before.
- School Statistics (principal): student, teacher, parent and pending-verification numbers and events.
- Billing (principal): what the school or firm owes, invoices, the recurring plan if any, and saved cards. The app only stores the card brand, last 4 digits, expiry and name. Real payments are not switched on yet.
- Staff Management: the principal sees staff members, teachers and principals.
- Help: this assistant. If it cannot solve a problem it sends the chat to an admin, who replies when available (a few business minutes to hours).
- Admin only: Users, Classes, Organisations, School Management (members, slideshow, messages, billing and parent links for one school), Pending Verification, Broadcast, Parent-Teacher conversations, Branding (app name and logo for white-label schools) and Platform Statistics.

PARENT LINKING
A parent asks to be linked to a student. The student approves the request in Settings under Linked parents, or the admin approves it in School Management. Once linked, the parent can see that child's progress, homework, timetable and exams.

COMMON QUESTIONS
- "I cannot open a feature and see a lock": the account is not verified yet. An admin verifies accounts. Open Pending Verification for the status.
- "How do I change my picture": Settings, Profile, choose one of the 10 avatars.
- "How do I change the language or dark mode": Settings, Language or Appearance.
- "How do I log out": menu, Log Out.
- "Where is my child's progress": the Child Progress circle on the Parent home. A parent must be linked to the child first.
`.trim()

module.exports = { LANGUAGES, LANGUAGE_CODES, languageName, PAGE_KEYS, PAGES_BY_ROLE, APP_GUIDE }
