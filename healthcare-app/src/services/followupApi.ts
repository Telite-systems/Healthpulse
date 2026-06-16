// ============================================
// Follow-Up API Client
// Handles all HTTP requests for the Follow-Up System
// ============================================

import api from './api';
import type { ApiResponse, PaginatedResponse } from './api';
import type { FollowUp } from '../types';

export interface CreateFollowUpData {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  originalAppointmentId?: string;
  followupType: string;
  priority: string;
  reason: string;
  notes: string;
  scheduledDate: string;
  scheduledTime: string;
}

export interface RescheduleData {
  preferredDate: string;
  preferredTime: string;
  reason?: string;
}

export interface ApproveData {
  approvedDate?: string;
  approvedTime?: string;
}

export interface FollowUpAnalytics {
  total: number;
  completed: number;
  missed: number;
  rescheduled: number;
  upcoming: number;
  scheduled: number;
  accepted: number;
}

export const followupApi = {
  create(data: CreateFollowUpData): Promise<ApiResponse<FollowUp>> {
    return api.request<FollowUp>('POST', '/api/followups', data);
  },

  getAll(page = 1, pageSize = 50, status?: string): Promise<ApiResponse<PaginatedResponse<FollowUp>>> {
    let url = `/api/followups?page=${page}&pageSize=${pageSize}`;
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }
    return api.request<PaginatedResponse<FollowUp>>('GET', url);
  },

  getById(id: string): Promise<ApiResponse<FollowUp>> {
    return api.request<FollowUp>('GET', `/api/followups/${id}`);
  },

  update(id: string, data: Partial<FollowUp>): Promise<ApiResponse<FollowUp>> {
    return api.request<FollowUp>('PUT', `/api/followups/${id}`, data);
  },

  accept(id: string): Promise<ApiResponse<FollowUp>> {
    return api.request<FollowUp>('POST', `/api/followups/${id}/accept`);
  },

  requestReschedule(id: string, data: RescheduleData): Promise<ApiResponse<FollowUp>> {
    return api.request<FollowUp>('POST', `/api/followups/${id}/reschedule-request`, data);
  },

  approveReschedule(id: string, data?: ApproveData): Promise<ApiResponse<FollowUp>> {
    return api.request<FollowUp>('POST', `/api/followups/${id}/approve-reschedule`, data || {});
  },

  complete(id: string): Promise<ApiResponse<FollowUp>> {
    return api.request<FollowUp>('POST', `/api/followups/${id}/complete`);
  },

  markMissed(id: string): Promise<ApiResponse<FollowUp>> {
    return api.request<FollowUp>('POST', `/api/followups/${id}/missed`);
  },

  getByPatient(patientId: string): Promise<ApiResponse<FollowUp[]>> {
    return api.request<FollowUp[]>('GET', `/api/followups/patient/${patientId}`);
  },

  getByDoctor(doctorId: string): Promise<ApiResponse<FollowUp[]>> {
    return api.request<FollowUp[]>('GET', `/api/followups/doctor/${doctorId}`);
  },

  getAnalytics(): Promise<ApiResponse<FollowUpAnalytics>> {
    return api.request<FollowUpAnalytics>('GET', '/api/followups/analytics');
  },
};
