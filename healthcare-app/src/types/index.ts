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
  licenseNo?: string;
  licenseValidity?: string;
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
  patientId?: string;
  doctorName: string;
  doctorId?: string;
  department: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In Progress' | 'Pending' | 'Confirmed';
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
  password?: string;
  name: string;
  role: 'Admin' | 'Doctor' | 'Staff' | 'Patient' | 'Vendor';
  avatar: string;
  specialization?: string;
  department?: string;
  address?: string;
  contact?: string;
}

export interface Vendor {
  id: string;
  name: string;
  username: string;
  email: string;
  contact: string;
  address: string;
  rating: number;
  distance: string;
  deliveryTime: string;
  status: 'Active' | 'Inactive';
}

export interface MedicineOrderItem {
  name: string;
  quantity: number;
  price: number;
  instructions?: string;
}

export interface MedicineOrder {
  id: string;
  patientId: string;
  patientName: string;
  prescriptionId: string;
  doctorId: string;
  doctorName: string;
  medicines: MedicineOrderItem[];
  deliveryAddress: string;
  contactNumber: string;
  vendorId: string;
  vendorName: string;
  status: 'Created' | 'Assigned' | 'Accepted' | 'Rejected' | 'Processing' | 'Ready for Dispatch' | 'Out for Delivery' | 'Delivered';
  totalAmount: number;
  totalPrice?: number;
  deliveryEta: string;
  createdAt: string;
  instructions?: string;
  prescriptionUrl?: string;
  paymentMethod?: 'UPI' | 'Card' | 'Net Banking' | 'COD';
  paymentStatus?: 'Pending' | 'Paid' | 'Failed';
}

export interface InventoryItem {
  id: string;
  vendorId: string;
  medicineName: string;
  sku: string;
  quantity: number;
  expiryDate: string;
  price: number;
  manufacturer: string;
  category?: string;
  description?: string;
  dosageInfo?: string;
  isPrescriptionRequired?: boolean;
}

export interface VendorAnalytics {
  id?: string;
  vendorId: string;
  date: string;
  dailyOrders: number;
  revenue: number;
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
