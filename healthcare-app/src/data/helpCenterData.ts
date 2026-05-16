// ============================================
// Help Center — Data Layer
// Types, seed articles, CRUD helpers
// ============================================

export type HelpRole = 'Patient' | 'Doctor' | 'Admin' | 'Staff';

export interface HelpStep {
  stepNumber: number;
  text: string;
  image?: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  role: HelpRole[];
  description: string;
  steps: HelpStep[];
  tags: string[];
  relatedArticles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HelpCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  description: string;
}

// ─── Categories ────────────────────────────────────────────────────────────────

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'appointments', label: 'Appointments', icon: '📅', color: '#0891b2', bg: 'rgba(8,145,178,0.12)', description: 'Booking, scheduling & management' },
  { id: 'records', label: 'Medical Records', icon: '📋', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', description: 'View & manage patient records' },
  { id: 'prescriptions', label: 'Prescriptions', icon: '💊', color: '#10b981', bg: 'rgba(16,185,129,0.12)', description: 'Medications & dosage info' },
  { id: 'billing', label: 'Billing & Payments', icon: '💳', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', description: 'Invoices, payments & insurance' },
  { id: 'telemedicine', label: 'Telemedicine', icon: '📹', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', description: 'Video & voice consultations' },
  { id: 'account', label: 'Account & Security', icon: '🔒', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', description: 'Profile, password & settings' },
  { id: 'admin', label: 'Administration', icon: '⚙️', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', description: 'System settings & user management' },
  { id: 'reports', label: 'Reports & Analytics', icon: '📊', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', description: 'Generate insights & reports' },
];

// ─── Seed Articles ─────────────────────────────────────────────────────────────

const now = new Date().toISOString();

const SEED_ARTICLES: HelpArticle[] = [
  // ── Patient Articles ──────────────────────────────────────────────────────
  {
    id: 'art-001',
    title: 'How to Book an Appointment',
    category: 'appointments',
    role: ['Patient'],
    description: 'Step-by-step guide to book an appointment with a doctor through the HealthPulse portal.',
    steps: [
      { stepNumber: 1, text: 'Login to your HealthPulse Patient Portal using your credentials.' },
      { stepNumber: 2, text: 'Click on "Book Appointment" in the sidebar or from your dashboard.' },
      { stepNumber: 3, text: 'Select your preferred department (e.g., Cardiology, General Medicine).' },
      { stepNumber: 4, text: 'Choose a doctor from the available list. You can see their specialization and availability.' },
      { stepNumber: 5, text: 'Pick a date and time slot that suits you.' },
      { stepNumber: 6, text: 'Add any notes about your symptoms or reason for visit.' },
      { stepNumber: 7, text: 'Click "Confirm Booking" to finalize your appointment. You will receive a confirmation notification.' },
    ],
    tags: ['book', 'appointment', 'schedule', 'doctor', 'booking', 'patient'],
    relatedArticles: ['art-002', 'art-005'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-002',
    title: 'How to View Medical Records',
    category: 'records',
    role: ['Patient'],
    description: 'Access your complete medical history, lab results, and visit summaries from the patient portal.',
    steps: [
      { stepNumber: 1, text: 'Navigate to the "Medical Records" section from the sidebar.' },
      { stepNumber: 2, text: 'You will see a list of all your past visits with dates and doctor names.' },
      { stepNumber: 3, text: 'Click on any visit to expand the full details — diagnosis, vitals, and treatment notes.' },
      { stepNumber: 4, text: 'Use the search bar to filter records by date range or doctor name.' },
      { stepNumber: 5, text: 'Click the download icon to save a record as PDF for your reference.' },
    ],
    tags: ['records', 'medical', 'history', 'visits', 'lab', 'results', 'patient'],
    relatedArticles: ['art-001', 'art-003'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-003',
    title: 'How to Download Prescriptions',
    category: 'prescriptions',
    role: ['Patient'],
    description: 'Download and view your current and past prescriptions from your patient dashboard.',
    steps: [
      { stepNumber: 1, text: 'Go to "Prescriptions" from the sidebar menu.' },
      { stepNumber: 2, text: 'Browse through your active and past prescriptions.' },
      { stepNumber: 3, text: 'Click on a prescription to view the full medication details, dosage, and instructions.' },
      { stepNumber: 4, text: 'Click the "Download PDF" button to save a copy to your device.' },
      { stepNumber: 5, text: 'You can share the downloaded prescription with your local pharmacy.' },
    ],
    tags: ['prescription', 'download', 'medication', 'dosage', 'pdf', 'patient'],
    relatedArticles: ['art-002', 'art-004'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-004',
    title: 'How to Start a Video Consultation',
    category: 'telemedicine',
    role: ['Patient'],
    description: 'Connect with your doctor via video or voice call for a virtual consultation.',
    steps: [
      { stepNumber: 1, text: 'Navigate to "Video Consultation" from the sidebar.' },
      { stepNumber: 2, text: 'You will see two options: "Start Video Call" and "Start Voice Call".' },
      { stepNumber: 3, text: 'Click your preferred option. Your browser will ask for camera/microphone permission — click Allow.' },
      { stepNumber: 4, text: 'Wait for the doctor to join the call. You will see a "Connected" status when they join.' },
      { stepNumber: 5, text: 'Use the control bar at the bottom to toggle mic, camera, or end the call.' },
      { stepNumber: 6, text: 'Use the Consultation Chat panel on the right to send text messages during the call.' },
    ],
    tags: ['video', 'call', 'telemedicine', 'consultation', 'voice', 'camera', 'patient'],
    relatedArticles: ['art-001', 'art-005'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-005',
    title: 'Understanding Your Bill & Payments',
    category: 'billing',
    role: ['Patient'],
    description: 'Learn how to view invoices, understand charges, and make payments through the portal.',
    steps: [
      { stepNumber: 1, text: 'Go to your Patient Dashboard — the billing summary is displayed in the overview cards.' },
      { stepNumber: 2, text: 'Click on the billing amount or navigate to the billing section for full details.' },
      { stepNumber: 3, text: 'Each invoice shows: services rendered, amount, discount, tax, and total.' },
      { stepNumber: 4, text: 'Payment methods supported: Cash, Card, Insurance, and UPI.' },
      { stepNumber: 5, text: 'You can filter invoices by status: Paid, Pending, or Overdue.' },
    ],
    tags: ['billing', 'payment', 'invoice', 'charges', 'insurance', 'upi', 'patient'],
    relatedArticles: ['art-001', 'art-002'],
    createdAt: now,
    updatedAt: now,
  },

  // ── Doctor Articles ───────────────────────────────────────────────────────
  {
    id: 'art-006',
    title: 'Managing Your Appointments',
    category: 'appointments',
    role: ['Doctor'],
    description: 'View, filter, and manage all your patient appointments from the Doctor Dashboard.',
    steps: [
      { stepNumber: 1, text: 'Login with your doctor credentials and navigate to the Doctor Dashboard.' },
      { stepNumber: 2, text: 'Click on the "Appointments" tab to see all your upcoming and past appointments.' },
      { stepNumber: 3, text: 'Use the status filter to view Scheduled, Completed, In Progress, or Cancelled appointments.' },
      { stepNumber: 4, text: 'Click on any appointment to see full patient details, notes, and history.' },
      { stepNumber: 5, text: 'Update the appointment status (e.g., mark as Completed) using the status dropdown.' },
    ],
    tags: ['appointments', 'manage', 'schedule', 'doctor', 'dashboard'],
    relatedArticles: ['art-007', 'art-008'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-007',
    title: 'Accessing Patient Records',
    category: 'records',
    role: ['Doctor'],
    description: 'View complete patient histories, visit records, and diagnostic information.',
    steps: [
      { stepNumber: 1, text: 'Go to the "My Patients" tab in your Doctor Dashboard.' },
      { stepNumber: 2, text: 'Browse or search for a patient by name or ID.' },
      { stepNumber: 3, text: 'Click on a patient to view their full profile: demographics, visit history, and vitals.' },
      { stepNumber: 4, text: 'Click "Records" button next to any patient to view their complete medical records.' },
      { stepNumber: 5, text: 'You can view past diagnoses, treatments, and lab results from this panel.' },
    ],
    tags: ['patient', 'records', 'history', 'diagnosis', 'vitals', 'doctor'],
    relatedArticles: ['art-006', 'art-008'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-008',
    title: 'Writing & Updating Prescriptions',
    category: 'prescriptions',
    role: ['Doctor'],
    description: 'Create new prescriptions and update existing ones for your patients.',
    steps: [
      { stepNumber: 1, text: 'Navigate to the "Prescriptions" tab in your Doctor Dashboard.' },
      { stepNumber: 2, text: 'Click "New Prescription" to create a prescription for a patient.' },
      { stepNumber: 3, text: 'Select the patient from the dropdown list.' },
      { stepNumber: 4, text: 'Enter the medications, dosage, duration, and special instructions.' },
      { stepNumber: 5, text: 'Click "Save" to create the prescription. It will appear in the patient\'s portal.' },
      { stepNumber: 6, text: 'To update an existing prescription, click the "Update" button next to it.' },
    ],
    tags: ['prescription', 'write', 'update', 'medication', 'dosage', 'doctor'],
    relatedArticles: ['art-006', 'art-009'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-009',
    title: 'Using Video Consultation Tools',
    category: 'telemedicine',
    role: ['Doctor'],
    description: 'Start and manage video/voice consultations with patients through the telemedicine module.',
    steps: [
      { stepNumber: 1, text: 'Go to "Video Consultation" from the sidebar.' },
      { stepNumber: 2, text: 'Click "Start Video Call" or "Start Voice Call" depending on the consultation type.' },
      { stepNumber: 3, text: 'Allow camera and microphone permissions when prompted by the browser.' },
      { stepNumber: 4, text: 'Your live camera feed will appear in the self-view window (bottom-right).' },
      { stepNumber: 5, text: 'Use the control bar to toggle mic/camera, share screen, or end the call.' },
      { stepNumber: 6, text: 'Use the Chat panel on the right side to send text notes to the patient during the call.' },
    ],
    tags: ['video', 'call', 'telemedicine', 'consultation', 'screen share', 'doctor'],
    relatedArticles: ['art-006', 'art-008'],
    createdAt: now,
    updatedAt: now,
  },

  // ── Admin Articles ────────────────────────────────────────────────────────
  {
    id: 'art-010',
    title: 'Managing Users & Roles',
    category: 'admin',
    role: ['Admin'],
    description: 'Add, edit, and manage user accounts and their role-based permissions.',
    steps: [
      { stepNumber: 1, text: 'Login as Admin and navigate to "Master Data" from the sidebar.' },
      { stepNumber: 2, text: 'You will see tabs for Patients, Doctors, Staff, and Departments.' },
      { stepNumber: 3, text: 'Click the "Add New" button to create a new user record.' },
      { stepNumber: 4, text: 'Fill in the required details: name, email, phone, department, and role.' },
      { stepNumber: 5, text: 'Click "Save" to create the user. They will receive login credentials.' },
      { stepNumber: 6, text: 'To edit or delete a user, use the action buttons in the table row.' },
    ],
    tags: ['users', 'manage', 'roles', 'permissions', 'add', 'edit', 'delete', 'admin'],
    relatedArticles: ['art-011', 'art-012'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-011',
    title: 'Configuring System Settings',
    category: 'admin',
    role: ['Admin'],
    description: 'Configure platform appearance, notifications, security, and system preferences.',
    steps: [
      { stepNumber: 1, text: 'Navigate to "Settings" from the sidebar.' },
      { stepNumber: 2, text: 'Appearance: Toggle between Dark and Light mode. Enable/disable animations and compact layout.' },
      { stepNumber: 3, text: 'Notifications: Configure push notifications, email alerts, and sound effects.' },
      { stepNumber: 4, text: 'Security: Enable Two-Factor Authentication, change password, set session timeout.' },
      { stepNumber: 5, text: 'System: Change language, export data as CSV/PDF, or clear local cache.' },
    ],
    tags: ['settings', 'system', 'configuration', 'theme', 'dark mode', 'notifications', 'admin'],
    relatedArticles: ['art-010', 'art-012'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-012',
    title: 'Reports & Analytics Dashboard',
    category: 'reports',
    role: ['Admin'],
    description: 'Generate and analyze hospital-wide reports for appointments, revenue, and patient statistics.',
    steps: [
      { stepNumber: 1, text: 'Go to "Reports & Analytics" from the sidebar.' },
      { stepNumber: 2, text: 'View the overview dashboard with key metrics: patients, appointments, revenue.' },
      { stepNumber: 3, text: 'Use date range filters to narrow down the reporting period.' },
      { stepNumber: 4, text: 'Click on individual charts to drill down into detailed data.' },
      { stepNumber: 5, text: 'Export reports as PDF or CSV using the export button at the top-right.' },
    ],
    tags: ['reports', 'analytics', 'dashboard', 'statistics', 'revenue', 'admin'],
    relatedArticles: ['art-010', 'art-013'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-013',
    title: 'Managing Master & Transaction Data',
    category: 'admin',
    role: ['Admin'],
    description: 'Learn how to manage core data modules: patients, doctors, staff, departments, and transactions.',
    steps: [
      { stepNumber: 1, text: 'Navigate to "Master Data" for core entity management.' },
      { stepNumber: 2, text: 'Use the tab navigation to switch between Patients, Doctors, Staff, and Departments.' },
      { stepNumber: 3, text: 'Each tab shows a data table with search, sort, and action buttons.' },
      { stepNumber: 4, text: 'Navigate to "Transaction Data" for appointments, visits, billing, and prescriptions.' },
      { stepNumber: 5, text: 'Use the "Add New" button to create new records in any module.' },
      { stepNumber: 6, text: 'Use Edit/Delete actions in the table to modify or remove existing records.' },
    ],
    tags: ['master', 'transaction', 'data', 'patients', 'doctors', 'staff', 'departments', 'admin'],
    relatedArticles: ['art-010', 'art-012'],
    createdAt: now,
    updatedAt: now,
  },

  // ── Staff Articles ────────────────────────────────────────────────────────
  {
    id: 'art-014',
    title: 'Scheduling Patient Appointments',
    category: 'appointments',
    role: ['Staff'],
    description: 'Schedule, reschedule, and manage patient appointments as a hospital staff member.',
    steps: [
      { stepNumber: 1, text: 'Login with your Staff credentials.' },
      { stepNumber: 2, text: 'Navigate to "Transaction Data" from the sidebar.' },
      { stepNumber: 3, text: 'Click the "Appointments" tab to view all scheduled appointments.' },
      { stepNumber: 4, text: 'Click "Add New" to create a new appointment for a patient.' },
      { stepNumber: 5, text: 'Fill in: patient name, doctor, department, date, time, and appointment type.' },
      { stepNumber: 6, text: 'Click "Save" to confirm. The appointment will appear on both the patient\'s and doctor\'s dashboards.' },
    ],
    tags: ['schedule', 'appointment', 'patient', 'staff', 'booking'],
    relatedArticles: ['art-015', 'art-016'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-015',
    title: 'Patient Check-in & Handling',
    category: 'records',
    role: ['Staff'],
    description: 'Process patient arrivals, update visit records, and manage the reception workflow.',
    steps: [
      { stepNumber: 1, text: 'When a patient arrives, search for their name in "Master Data" > Patients tab.' },
      { stepNumber: 2, text: 'Verify the patient\'s identity and confirm their scheduled appointment.' },
      { stepNumber: 3, text: 'Update the appointment status to "In Progress" in Transaction Data.' },
      { stepNumber: 4, text: 'Direct the patient to the assigned department and doctor.' },
      { stepNumber: 5, text: 'After the visit, verify the appointment is marked as "Completed" by the doctor.' },
    ],
    tags: ['check-in', 'patient', 'handling', 'reception', 'visit', 'staff'],
    relatedArticles: ['art-014', 'art-016'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-016',
    title: 'Support Tasks & Data Management',
    category: 'admin',
    role: ['Staff'],
    description: 'Common support tasks: data entry, record updates, and report generation for staff members.',
    steps: [
      { stepNumber: 1, text: 'Use "Master Data" to add or update patient, doctor, or staff information.' },
      { stepNumber: 2, text: 'Use "Transaction Data" for managing appointments, visits, billing, and prescriptions.' },
      { stepNumber: 3, text: 'Use the search functionality in each tab to quickly find records.' },
      { stepNumber: 4, text: 'Navigate to "Reports" to generate daily or weekly summaries.' },
      { stepNumber: 5, text: 'Use the "Chatbot Assistant" for quick data lookups and support.' },
    ],
    tags: ['support', 'tasks', 'data', 'entry', 'management', 'staff'],
    relatedArticles: ['art-014', 'art-015'],
    createdAt: now,
    updatedAt: now,
  },

  // ── Shared / Cross-role Articles ──────────────────────────────────────────
  {
    id: 'art-017',
    title: 'How to Change Your Password',
    category: 'account',
    role: ['Patient', 'Doctor', 'Admin', 'Staff'],
    description: 'Update your login password from the Settings page for enhanced security.',
    steps: [
      { stepNumber: 1, text: 'Navigate to "Settings" from the sidebar.' },
      { stepNumber: 2, text: 'Find the "Account & Security" card.' },
      { stepNumber: 3, text: 'Click the "Update" button next to "Change Password".' },
      { stepNumber: 4, text: 'Enter your current password and your new password twice.' },
      { stepNumber: 5, text: 'Click "Save" to update. You will be logged out and need to login with the new password.' },
    ],
    tags: ['password', 'change', 'security', 'account', 'login', 'update'],
    relatedArticles: ['art-018', 'art-019'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-018',
    title: 'Switching Dark & Light Mode',
    category: 'account',
    role: ['Patient', 'Doctor', 'Admin', 'Staff'],
    description: 'Toggle between dark and light themes for a comfortable viewing experience.',
    steps: [
      { stepNumber: 1, text: 'Go to "Settings" from the sidebar.' },
      { stepNumber: 2, text: 'Under the "Appearance" card, find the Dark/Light Mode toggle.' },
      { stepNumber: 3, text: 'Click the toggle switch to change the theme instantly.' },
      { stepNumber: 4, text: 'Your preference is saved automatically and persists across sessions.' },
    ],
    tags: ['dark', 'light', 'mode', 'theme', 'appearance', 'toggle'],
    relatedArticles: ['art-017', 'art-011'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-019',
    title: 'Using the AI Chatbot Assistant',
    category: 'account',
    role: ['Patient', 'Doctor', 'Admin', 'Staff'],
    description: 'Get instant AI-powered assistance for health queries, appointments, and platform navigation.',
    steps: [
      { stepNumber: 1, text: 'Click the chat bubble icon (💬) at the bottom-right corner of any page.' },
      { stepNumber: 2, text: 'The chatbot window will open with Dr. HealthPulse greeting you.' },
      { stepNumber: 3, text: 'Type your question in the input box or click one of the quick action buttons.' },
      { stepNumber: 4, text: 'You can also use the microphone button to speak in Hindi or English.' },
      { stepNumber: 5, text: 'The chatbot supports health symptoms, appointment booking, and general queries.' },
      { stepNumber: 6, text: 'Use the header buttons for Video Call, Voice Call, or Emergency Call (108).' },
    ],
    tags: ['chatbot', 'ai', 'assistant', 'help', 'bot', 'healthpulse'],
    relatedArticles: ['art-017', 'art-004'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-020',
    title: 'Emergency Call Feature',
    category: 'telemedicine',
    role: ['Patient', 'Doctor', 'Admin', 'Staff'],
    description: 'Quickly access emergency services through the platform\'s emergency call feature.',
    steps: [
      { stepNumber: 1, text: 'Open the Chatbot by clicking the chat bubble at the bottom-right corner.' },
      { stepNumber: 2, text: 'In the chatbot header, you will see a red pulsing phone button.' },
      { stepNumber: 3, text: 'Click the red Emergency Call button to dial 108 (Emergency Services).' },
      { stepNumber: 4, text: 'Your device\'s phone dialer will open with 108 pre-filled.' },
      { stepNumber: 5, text: 'Alternatively, type emergency symptoms in the chatbot — it will show an emergency alert with action buttons.' },
    ],
    tags: ['emergency', 'call', '108', 'ambulance', 'urgent', 'help'],
    relatedArticles: ['art-004', 'art-019'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'art-021',
    title: 'Navigating the Dashboard',
    category: 'account',
    role: ['Patient', 'Doctor', 'Admin', 'Staff'],
    description: 'Understand the main dashboard layout, sidebar navigation, and key features.',
    steps: [
      { stepNumber: 1, text: 'After login, you arrive at the Dashboard — your role-specific home page.' },
      { stepNumber: 2, text: 'The sidebar on the left shows all accessible modules for your role.' },
      { stepNumber: 3, text: 'The top header has a search bar, theme toggle, and notification bell.' },
      { stepNumber: 4, text: 'Dashboard cards show key statistics relevant to your role.' },
      { stepNumber: 5, text: 'Click on any sidebar item to navigate to that module.' },
      { stepNumber: 6, text: 'Use the collapse button (◀) to minimize the sidebar for more workspace.' },
    ],
    tags: ['dashboard', 'navigation', 'sidebar', 'layout', 'home', 'overview'],
    relatedArticles: ['art-017', 'art-019'],
    createdAt: now,
    updatedAt: now,
  },
];

// ─── LocalStorage Key ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'hp_help_articles';

// ─── Initialize from localStorage or seed ──────────────────────────────────────

function initArticles(): HelpArticle[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as HelpArticle[];
      if (parsed.length > 0) return parsed;
    }
  } catch {
    // corrupted — re-seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ARTICLES));
  return [...SEED_ARTICLES];
}

// ─── CRUD Helpers ──────────────────────────────────────────────────────────────

export function getArticles(): HelpArticle[] {
  return initArticles();
}

export function getArticleById(id: string): HelpArticle | undefined {
  return initArticles().find(a => a.id === id);
}

export function getArticlesByRole(role: HelpRole): HelpArticle[] {
  return initArticles().filter(a => a.role.includes(role));
}

export function getArticlesByCategory(category: string): HelpArticle[] {
  return initArticles().filter(a => a.category === category);
}

export function searchArticles(query: string, role?: HelpRole): HelpArticle[] {
  const lo = query.toLowerCase().trim();
  if (!lo) return role ? getArticlesByRole(role) : getArticles();

  const words = lo.split(/\s+/);
  return initArticles().filter(a => {
    if (role && !a.role.includes(role)) return false;
    const haystack = `${a.title} ${a.description} ${a.tags.join(' ')} ${a.category}`.toLowerCase();
    return words.every(w => haystack.includes(w));
  });
}

export function saveArticle(article: HelpArticle): void {
  const articles = initArticles();
  const idx = articles.findIndex(a => a.id === article.id);
  if (idx >= 0) {
    articles[idx] = { ...article, updatedAt: new Date().toISOString() };
  } else {
    articles.push({ ...article, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

export function deleteArticle(id: string): void {
  const articles = initArticles().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

export function getCategoryArticleCount(category: string, role?: HelpRole): number {
  const articles = role ? getArticlesByRole(role) : getArticles();
  return articles.filter(a => a.category === category).length;
}

/** Quick search for chatbot — returns top matches */
export function findHelpArticles(query: string, role?: HelpRole, limit = 3): HelpArticle[] {
  return searchArticles(query, role).slice(0, limit);
}
