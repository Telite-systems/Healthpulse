// ============================================
// Healthcare System Types
// ============================================

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contact: string;
  email: string;
  address: string;
  bloodGroup: string;
  registeredDate: string;
  status: 'Active' | 'Inactive';
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  contact: string;
  email: string;
  experience: number;
  department: string;
  availability: string;
  status: 'Available' | 'On Leave' | 'Busy';
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  department: string;
  contact: string;
  email: string;
  joinDate: string;
  status: 'Active' | 'Inactive';
}

export interface Department {
  id: string;
  name: string;
  head: string;
  staffCount: number;
  location: string;
  status: 'Active' | 'Inactive';
}

export interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In Progress';
  type: 'Consultation' | 'Follow-up' | 'Emergency';
  notes: string;
  createdAt: string;
}

export interface PatientVisit {
  id: string;
  patientName: string;
  doctorName: string;
  visitDate: string;
  diagnosis: string;
  treatment: string;
  followUpDate: string;
  status: 'Completed' | 'Pending' | 'Follow-up Required';
  vitals: {
    bp: string;
    temp: string;
    pulse: string;
    weight: string;
  };
  createdAt: string;
}

export interface Billing {
  id: string;
  patientName: string;
  invoiceDate: string;
  services: string;
  amount: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Insurance' | 'UPI';
  status: 'Paid' | 'Pending' | 'Overdue';
  createdAt: string;
}

export interface Prescription {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  medications: string;
  dosage: string;
  duration: string;
  instructions: string;
  status: 'Active' | 'Completed' | 'Expired';
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'Admin' | 'Doctor' | 'Staff';
  avatar: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  quickActions?: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  read: boolean;
}
