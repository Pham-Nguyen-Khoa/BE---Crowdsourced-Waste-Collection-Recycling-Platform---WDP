export interface EnterprisePriority {
  enterpriseId: number;
  enterpriseName: string;
  latitude: number;
  longitude: number;
  distance: number;
  availableCollectors: number;
  activeReports: number;
  isVip: boolean;
  priorityScore: number;
  workingHours?: {
    startTime: string;
    endTime: string;
  };
}

export interface EnterprisePriorityFilter {
  reportId: number;
  wasteTypes: string[];
  provinceCode: string;
  districtCode: string;
  wardCode: string;
  totalWeightKg: number;
  reportLatitude: number;
  reportLongitude: number;
}
