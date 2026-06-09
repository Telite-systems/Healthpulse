import type { Patient, Doctor, Staff, Department, Appointment, PatientVisit, Billing, Prescription, User, Notification } from '../types';

// ============================================
// Users for login
// ============================================
export const mockUsers: User[] = [
  { id: 'U001', username: 'admin', password: 'admin123', name: 'Dr. Admin Singh', role: 'Admin', avatar: '🛡️' },
  { id: 'U002', username: 'doctor', password: 'doctor123', name: 'Dr. Rajesh Kumar', role: 'Doctor', avatar: '👨‍⚕️' },
  { id: 'U003', username: 'staff', password: 'staff123', name: 'Priya Staff', role: 'Staff', avatar: '👩‍💼' },
];

// ============================================
// Patients
// ============================================
export const mockPatients: Patient[] = [
  { id: 'P001', name: 'John Anderson', age: 45, gender: 'Male', contact: '+1-555-0101', email: 'john.a@email.com', address: '123 Oak St, Springfield', bloodGroup: 'A+', registeredDate: '2025-01-15', status: 'Active' },
  { id: 'P002', name: 'Maria Garcia', age: 32, gender: 'Female', contact: '+1-555-0102', email: 'maria.g@email.com', address: '456 Pine Ave, Riverside', bloodGroup: 'O+', registeredDate: '2025-02-20', status: 'Active' },
  { id: 'P003', name: 'Robert Chen', age: 58, gender: 'Male', contact: '+1-555-0103', email: 'robert.c@email.com', address: '789 Elm Dr, Lakewood', bloodGroup: 'B-', registeredDate: '2025-03-10', status: 'Active' },
  { id: 'P004', name: 'Emily Davis', age: 27, gender: 'Female', contact: '+1-555-0104', email: 'emily.d@email.com', address: '321 Maple Ln, Fairview', bloodGroup: 'AB+', registeredDate: '2025-04-05', status: 'Active' },
  { id: 'P005', name: 'David Kim', age: 63, gender: 'Male', contact: '+1-555-0105', email: 'david.k@email.com', address: '654 Cedar Rd, Greenville', bloodGroup: 'O-', registeredDate: '2025-05-12', status: 'Inactive' },
  { id: 'P006', name: 'Lisa Thompson', age: 39, gender: 'Female', contact: '+1-555-0106', email: 'lisa.t@email.com', address: '987 Birch Ct, Westfield', bloodGroup: 'A-', registeredDate: '2025-06-18', status: 'Active' },
  { id: 'P007', name: 'Michael Brown', age: 51, gender: 'Male', contact: '+1-555-0107', email: 'michael.b@email.com', address: '147 Walnut St, Eastside', bloodGroup: 'B+', registeredDate: '2025-07-22', status: 'Active' },
  { id: 'P008', name: 'Sarah Johnson', age: 34, gender: 'Female', contact: '+1-555-0108', email: 'sarah.j@email.com', address: '258 Cherry Blvd, Northdale', bloodGroup: 'AB-', registeredDate: '2025-08-30', status: 'Active' },
];

// ============================================
// Doctors
// ============================================
export const mockDoctors: Doctor[] = [
  { id: 'D001', name: 'Dr. Rajesh Kumar', specialization: 'Cardiology', contact: '+91-98765-43210', email: 'rajesh.kumar@hospital.com', experience: 15, department: 'Cardiology', availability: 'Mon-Fri 9AM-5PM', status: 'Available', licenseNo: 'MC-10023', licenseValidity: '2030-12-31' },
  { id: 'D002', name: 'Dr. Sneha Verma', specialization: 'Neurology', contact: '+91-98765-43211', email: 'sneha.verma@hospital.com', experience: 12, department: 'Neurology', availability: 'Mon-Sat 10AM-6PM', status: 'Available', licenseNo: 'MC-20412', licenseValidity: '2029-06-30' },
  { id: 'D003', name: 'Dr. Vikram Patel', specialization: 'Orthopedics', contact: '+91-98765-43212', email: 'vikram.patel@hospital.com', experience: 20, department: 'Orthopedics', availability: 'Tue-Sat 8AM-4PM', status: 'Available', licenseNo: 'MC-30114', licenseValidity: '2028-10-15' },
  { id: 'D004', name: 'Dr. Ananya Reddy', specialization: 'Pediatrics', contact: '+91-98765-43213', email: 'ananya.reddy@hospital.com', experience: 10, department: 'Pediatrics', availability: 'Mon-Fri 9AM-3PM', status: 'Available', licenseNo: 'MC-40992', licenseValidity: '2031-03-31' },
  { id: 'D005', name: 'Dr. Kavita Negi', specialization: 'Dermatology', contact: '+91-98765-43214', email: 'kavita.negi@hospital.com', experience: 8, department: 'Dermatology', availability: 'Mon-Thu 10AM-5PM', status: 'Available', licenseNo: 'MC-50771', licenseValidity: '2029-11-30' },
  { id: 'D006', name: 'Dr. Arjun Mehta', specialization: 'General Surgery', contact: '+91-98765-43215', email: 'arjun.mehta@hospital.com', experience: 18, department: 'General Surgery', availability: 'Mon-Fri 7AM-3PM', status: 'Available', licenseNo: 'MC-60234', licenseValidity: '2030-05-15' },
  { id: 'D007', name: 'Dr. Pooja Sharma', specialization: 'Gynecology', contact: '+91-98765-43216', email: 'pooja.sharma@hospital.com', experience: 14, department: 'Gynecology', availability: 'Mon-Fri 10AM-4PM', status: 'Available', licenseNo: 'MC-70119', licenseValidity: '2032-04-20' },
  { id: 'D008', name: 'Dr. Suresh Yadav', specialization: 'ENT', contact: '+91-98765-43217', email: 'suresh.yadav@hospital.com', experience: 11, department: 'ENT', availability: 'Mon-Sat 9AM-5PM', status: 'Available', licenseNo: 'MC-80554', licenseValidity: '2029-08-31' },
  { id: 'D009', name: 'Dr. Meena Iyer', specialization: 'Ophthalmology', contact: '+91-98765-43218', email: 'meena.iyer@hospital.com', experience: 16, department: 'Ophthalmology', availability: 'Tue-Sat 9AM-4PM', status: 'Available', licenseNo: 'MC-90881', licenseValidity: '2028-12-31' },
  { id: 'D010', name: 'Dr. Ravi Gupta', specialization: 'General Medicine', contact: '+91-98765-43219', email: 'ravi.gupta@hospital.com', experience: 22, department: 'General Medicine', availability: 'Mon-Fri 8AM-6PM', status: 'Available', licenseNo: 'MC-11005', licenseValidity: '2031-07-31' },
  { id: 'D011', name: 'Dr. Neha Joshi', specialization: 'Psychiatry', contact: '+91-98765-43220', email: 'neha.joshi@hospital.com', experience: 9, department: 'Psychiatry', availability: 'Mon-Fri 10AM-5PM', status: 'Available', licenseNo: 'MC-12006', licenseValidity: '2030-01-31' },
  { id: 'D012', name: 'Dr. Amit Tiwari', specialization: 'Pulmonology', contact: '+91-98765-43221', email: 'amit.tiwari@hospital.com', experience: 13, department: 'Pulmonology', availability: 'Mon-Sat 9AM-4PM', status: 'Available', licenseNo: 'MC-13007', licenseValidity: '2032-09-30' },
];


// ============================================
// Staff
// ============================================
export const mockStaff: Staff[] = [
  { id: 'S001', name: 'Emily Parker', role: 'Head Nurse', department: 'General', contact: '+1-555-0301', email: 'parker@hospital.com', joinDate: '2020-03-15', status: 'Active' },
  { id: 'S002', name: 'Tom Richards', role: 'Lab Technician', department: 'Pathology', contact: '+1-555-0302', email: 'richards@hospital.com', joinDate: '2021-06-20', status: 'Active' },
  { id: 'S003', name: 'Nancy White', role: 'Receptionist', department: 'Front Desk', contact: '+1-555-0303', email: 'white@hospital.com', joinDate: '2022-01-10', status: 'Active' },
  { id: 'S004', name: 'Carlos Mendez', role: 'Pharmacist', department: 'Pharmacy', contact: '+1-555-0304', email: 'mendez@hospital.com', joinDate: '2019-09-05', status: 'Active' },
  { id: 'S005', name: 'Diana Foster', role: 'Radiologist Tech', department: 'Radiology', contact: '+1-555-0305', email: 'foster@hospital.com', joinDate: '2023-02-14', status: 'Inactive' },
];

// ============================================
// Departments
// ============================================
export const mockDepartments: Department[] = [
  { id: 'DEP001', name: 'Cardiology', head: 'Dr. Rajesh Kumar', staffCount: 25, location: 'Building A, Floor 3', status: 'Active' },
  { id: 'DEP002', name: 'Neurology', head: 'Dr. Sneha Verma', staffCount: 18, location: 'Building A, Floor 4', status: 'Active' },
  { id: 'DEP003', name: 'Orthopedics', head: 'Dr. Vikram Patel', staffCount: 22, location: 'Building B, Floor 2', status: 'Active' },
  { id: 'DEP004', name: 'Pediatrics', head: 'Dr. Ananya Reddy', staffCount: 15, location: 'Building C, Floor 1', status: 'Active' },
  { id: 'DEP005', name: 'Dermatology', head: 'Dr. Kavita Negi', staffCount: 10, location: 'Building A, Floor 2', status: 'Active' },
  { id: 'DEP006', name: 'General Surgery', head: 'Dr. Arjun Mehta', staffCount: 30, location: 'Building B, Floor 1', status: 'Active' },
  { id: 'DEP007', name: 'Emergency', head: 'Dr. Ravi Gupta', staffCount: 35, location: 'Building A, Floor 1', status: 'Active' },
  { id: 'DEP008', name: 'Gynecology', head: 'Dr. Pooja Sharma', staffCount: 12, location: 'Building C, Floor 2', status: 'Active' },
  { id: 'DEP009', name: 'ENT', head: 'Dr. Suresh Yadav', staffCount: 8, location: 'Building A, Floor 5', status: 'Active' },
  { id: 'DEP010', name: 'Ophthalmology', head: 'Dr. Meena Iyer', staffCount: 10, location: 'Building B, Floor 3', status: 'Active' },
  { id: 'DEP011', name: 'Psychiatry', head: 'Dr. Neha Joshi', staffCount: 7, location: 'Building C, Floor 3', status: 'Active' },
  { id: 'DEP012', name: 'Pulmonology', head: 'Dr. Amit Tiwari', staffCount: 9, location: 'Building A, Floor 6', status: 'Active' },
  { id: 'DEP013', name: 'General Medicine', head: 'Dr. Ravi Gupta', staffCount: 20, location: 'Building A, Floor 1', status: 'Active' },
];

// ============================================
// Appointments
// ============================================
export const mockAppointments: Appointment[] = [
  { id: 'APT001', patientName: 'John Anderson', doctorName: 'Dr. Rajesh Kumar', department: 'Cardiology', date: '2026-04-07', time: '09:00 AM', status: 'Scheduled', type: 'Consultation', notes: 'Regular heart checkup', createdAt: '2026-04-01T10:30:00' },
  { id: 'APT002', patientName: 'Maria Garcia', doctorName: 'Dr. Sneha Verma', department: 'Neurology', date: '2026-04-07', time: '10:30 AM', status: 'Scheduled', type: 'Follow-up', notes: 'Post-treatment review', createdAt: '2026-04-02T14:00:00' },
  { id: 'APT003', patientName: 'Robert Chen', doctorName: 'Dr. Vikram Patel', department: 'Orthopedics', date: '2026-04-06', time: '02:00 PM', status: 'In Progress', type: 'Consultation', notes: 'Knee pain evaluation', createdAt: '2026-04-03T09:15:00' },
  { id: 'APT004', patientName: 'Emily Davis', doctorName: 'Dr. Ananya Reddy', department: 'Pediatrics', date: '2026-04-05', time: '11:00 AM', status: 'Completed', type: 'Consultation', notes: 'Routine checkup', createdAt: '2026-04-01T08:00:00' },
  { id: 'APT005', patientName: 'David Kim', doctorName: 'Dr. Arjun Mehta', department: 'General Surgery', date: '2026-04-08', time: '08:00 AM', status: 'Scheduled', type: 'Emergency', notes: 'Pre-surgery evaluation', createdAt: '2026-04-04T16:30:00' },
  { id: 'APT006', patientName: 'Lisa Thompson', doctorName: 'Dr. Rajesh Kumar', department: 'Cardiology', date: '2026-04-06', time: '03:30 PM', status: 'Completed', type: 'Follow-up', notes: 'ECG results review', createdAt: '2026-04-02T11:00:00' },
];

// ============================================
// Patient Visits
// ============================================
export const mockVisits: PatientVisit[] = [
  { id: 'V001', patientName: 'John Anderson', doctorName: 'Dr. Rajesh Kumar', visitDate: '2026-04-01', diagnosis: 'Mild hypertension', treatment: 'Prescribed ACE inhibitors', followUpDate: '2026-04-15', status: 'Follow-up Required', vitals: { bp: '140/90', temp: '98.6°F', pulse: '78 bpm', weight: '82 kg' }, createdAt: '2026-04-01T10:45:00' },
  { id: 'V002', patientName: 'Maria Garcia', doctorName: 'Dr. Sneha Verma', visitDate: '2026-03-28', diagnosis: 'Tension headache', treatment: 'Pain management therapy', followUpDate: '2026-04-10', status: 'Completed', vitals: { bp: '120/80', temp: '98.4°F', pulse: '72 bpm', weight: '65 kg' }, createdAt: '2026-03-28T14:20:00' },
  { id: 'V003', patientName: 'Robert Chen', doctorName: 'Dr. Vikram Patel', visitDate: '2026-04-03', diagnosis: 'Osteoarthritis - right knee', treatment: 'Physical therapy + NSAIDs', followUpDate: '2026-04-20', status: 'Follow-up Required', vitals: { bp: '135/85', temp: '98.2°F', pulse: '80 bpm', weight: '90 kg' }, createdAt: '2026-04-03T09:30:00' },
  { id: 'V004', patientName: 'Emily Davis', doctorName: 'Dr. Ananya Reddy', visitDate: '2026-04-05', diagnosis: 'Seasonal allergies', treatment: 'Antihistamines prescribed', followUpDate: '', status: 'Completed', vitals: { bp: '110/70', temp: '99.1°F', pulse: '68 bpm', weight: '58 kg' }, createdAt: '2026-04-05T11:15:00' },
];

// ============================================
// Billing
// ============================================
export const mockBilling: Billing[] = [
  { id: 'B001', patientName: 'John Anderson', invoiceDate: '2026-04-01', services: 'Consultation + ECG', amount: 2500, discount: 0, tax: 450, total: 2950, paymentMethod: 'Insurance', status: 'Paid', createdAt: '2026-04-01T11:00:00' },
  { id: 'B002', patientName: 'Maria Garcia', invoiceDate: '2026-03-28', services: 'Neurology Consultation + MRI', amount: 12000, discount: 1000, tax: 1980, total: 12980, paymentMethod: 'Card', status: 'Paid', createdAt: '2026-03-28T15:00:00' },
  { id: 'B003', patientName: 'Robert Chen', invoiceDate: '2026-04-03', services: 'Orthopedic Consultation + X-Ray', amount: 4500, discount: 500, tax: 720, total: 4720, paymentMethod: 'Cash', status: 'Pending', createdAt: '2026-04-03T10:00:00' },
  { id: 'B004', patientName: 'Emily Davis', invoiceDate: '2026-04-05', services: 'Pediatric Consultation', amount: 1500, discount: 0, tax: 270, total: 1770, paymentMethod: 'UPI', status: 'Paid', createdAt: '2026-04-05T12:00:00' },
  { id: 'B005', patientName: 'David Kim', invoiceDate: '2026-04-04', services: 'Pre-Surgery Labs + Consultation', amount: 8000, discount: 0, tax: 1440, total: 9440, paymentMethod: 'Insurance', status: 'Overdue', createdAt: '2026-04-04T16:45:00' },
];

// ============================================
// Prescriptions
// ============================================
export const mockPrescriptions: Prescription[] = [
  { id: 'RX001', patientName: 'John Anderson', doctorName: 'Dr. Rajesh Kumar', date: '2026-04-01', medications: 'Lisinopril 10mg, Aspirin 81mg', dosage: 'Once daily', duration: '30 days', instructions: 'Take with food. Monitor blood pressure daily.', status: 'Active', createdAt: '2026-04-01T11:30:00' },
  { id: 'RX002', patientName: 'Maria Garcia', doctorName: 'Dr. Sneha Verma', date: '2026-03-28', medications: 'Ibuprofen 400mg, Sumatriptan 50mg', dosage: 'As needed, max 2x daily', duration: '14 days', instructions: 'Take at onset of headache. Rest in dark room.', status: 'Active', createdAt: '2026-03-28T14:45:00' },
  { id: 'RX003', patientName: 'Robert Chen', doctorName: 'Dr. Vikram Patel', date: '2026-04-03', medications: 'Naproxen 500mg, Glucosamine 1500mg', dosage: 'Twice daily', duration: '60 days', instructions: 'Take with meals. Physical therapy 3x/week.', status: 'Active', createdAt: '2026-04-03T10:15:00' },
  { id: 'RX004', patientName: 'Emily Davis', doctorName: 'Dr. Ananya Reddy', date: '2026-04-05', medications: 'Cetirizine 10mg, Fluticasone nasal spray', dosage: 'Once daily', duration: '21 days', instructions: 'Take cetirizine at night. Use spray in morning.', status: 'Active', createdAt: '2026-04-05T11:45:00' },
];

// ============================================
// Notifications
// ============================================
export const mockNotifications: Notification[] = [
  { id: 'N001', title: 'New Appointment', message: 'David Kim has booked an emergency appointment for Apr 8', type: 'warning', time: '2 min ago', read: false },
  { id: 'N002', title: 'Payment Received', message: 'Payment of ₹2,950 received from John Anderson', type: 'success', time: '15 min ago', read: false },
  { id: 'N003', title: 'Lab Results Ready', message: 'Blood work results for Maria Garcia are available', type: 'info', time: '1 hour ago', read: false },
  { id: 'N004', title: 'Overdue Payment', message: 'Invoice B005 for David Kim is overdue', type: 'error', time: '3 hours ago', read: true },
  { id: 'N005', title: 'Schedule Update', message: 'Dr. Kavita Negi will be on leave until Apr 15', type: 'info', time: '5 hours ago', read: true },
  { id: 'N006', title: 'System Update', message: 'Healthcare system updated to v2.5', type: 'success', time: '1 day ago', read: true },
];

// ============================================
// Dashboard Stats
// ============================================
export const dashboardStats = {
  totalPatients: 1248,
  todayAppointments: 42,
  monthlyRevenue: 1285000,
  activeDoctors: 24,
  occupancyRate: 78,
  pendingBills: 15,
};

// ============================================
// Chart Data
// ============================================
export const chartData = {
  dailyPatients: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [35, 42, 38, 45, 50, 28, 22],
  },
  revenue: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    data: [95000, 105000, 112000, 128500, 118000, 135000],
  },
  appointments: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [28, 35, 32, 40, 42, 18, 15],
  },
  departmentVisits: {
    labels: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Surgery', 'Emergency'],
    data: [180, 120, 150, 95, 110, 200],
  },
};
