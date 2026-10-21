import { apiClient } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import { mapPage } from '@/lib/pagination';
import { BackendPage, PaginatedResponse } from '@/types/api';
import { Batch, Section, SectionStudent } from '@/types/academic';

/** Read-only academic structure lookups (active batches and their sections). */
export const academicService = {
  getBatches: async (): Promise<Batch[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ACADEMIC.BATCHES);
    return response.data.data;
  },

  getSections: async (batchId?: number): Promise<Section[]> => {
    const response = await apiClient.get(API_ENDPOINTS.ACADEMIC.SECTIONS, { params: { batchId } });
    return response.data.data;
  },

  /** Active students of a section, paged (size ≤ 200). HOD: any section; STAFF: sections they teach. */
  getSectionStudents: async (sectionId: number, page: number, size: number): Promise<PaginatedResponse<SectionStudent>> => {
    const response = await apiClient.get(API_ENDPOINTS.ACADEMIC.SECTION_STUDENTS(sectionId), { params: { page, size } });
    return mapPage(response.data.data as BackendPage<SectionStudent>);
  },
};
