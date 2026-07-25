export interface YearWiseStudent {
  year: number;
  student_count: number;
}

export interface SectionWiseStudent {
  section_id: number;
  section_name: string;
  batch_name: string;
  student_count: number;
}

export interface DashboardSummary {
  total_students: number;
  total_staff: number;
  year_wise_students: YearWiseStudent[];
  section_wise_students: SectionWiseStudent[];
}
