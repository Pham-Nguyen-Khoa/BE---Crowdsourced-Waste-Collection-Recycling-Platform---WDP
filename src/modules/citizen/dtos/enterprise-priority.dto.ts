export interface EnterprisePriority {
  enterpriseId: number
  distance: number
  availableCollectors: number
  activeReports: number
  isVip: boolean
  priorityScore: number
}