export interface ReportDispatchResponseDto {
  reportId: number;
  status: string;
  message: string;
  estimatedProcessingTime?: string;
  prioritizedEnterprisesCount?: number;
}
