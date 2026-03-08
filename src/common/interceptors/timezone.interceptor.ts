import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000; // +07:00 = 7h * 60m * 60s * 1000ms

/**
 * Convert một ISO UTC string ("...Z") → "...+07:00" (Giờ Việt Nam)
 */
function toVietnamISOString(date: Date): string {
  const localTime = new Date(date.getTime() + VIETNAM_OFFSET_MS);
  // Bỏ "Z" ở cuối rồi gắn "+07:00"
  return localTime.toISOString().replace('Z', '+07:00');
}

/**
 * Đệ quy quét object/array, tìm mọi trường là Date instance
 * hoặc ISO UTC string rồi convert sang giờ Việt Nam.
 */
function convertDates(value: any): any {
  if (value === null || value === undefined) return value;

  // Trường hợp là Date object
  if (value instanceof Date) {
    return toVietnamISOString(value);
  }

  // Trường hợp là string ISO UTC (kết thúc bằng "Z")
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)
  ) {
    return toVietnamISOString(new Date(value));
  }

  // Trường hợp là Array
  if (Array.isArray(value)) {
    return value.map(convertDates);
  }

  // Trường hợp là plain object
  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      result[key] = convertDates(value[key]);
    }
    return result;
  }

  return value;
}

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => convertDates(data)));
  }
}
