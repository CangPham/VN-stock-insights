
/**
 * @fileOverview Failover Manager - Cơ chế chuyển đổi dự phòng cho các API client
 * Thử nhiều nguồn dữ liệu khi một nguồn không khả dụng
 */

import type { BaseApiClient, ApiResponse } from './base-client';
import { ApiErrorClass, ErrorType } from './error-handler';

export interface FailoverConfig {
  primary: BaseApiClient;
  backups: BaseApiClient[];
}

export class FailoverManager {
  private primary: BaseApiClient;
  private backups: BaseApiClient[];

  constructor(config: FailoverConfig) {
    this.primary = config.primary;
    this.backups = config.backups;
  }

  public updatePrimary(client: BaseApiClient): void {
    this.primary = client;
  }

  public updateBackups(backups: BaseApiClient[]): void {
    this.backups = backups;
  }

  /**
   * Thực thi một hàm lấy dữ liệu với cơ chế chuyển đổi dự phòng.
   * Hàm sẽ thử lần lượt các client cho tới khi thành công.
   */
  public async fetchWithFailover<T>(operation: (client: BaseApiClient) => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    const clients = [this.primary, ...this.backups];
    const errors: unknown[] = [];

    for (const client of clients) {

      try {
        const result = await operation(client);
        if (result.success) {
          return result;
        }

        errors.push(result.error);
      } catch (error) {
        errors.push(error);
      }
    }

    throw new ApiErrorClass(ErrorType.SERVICE_UNAVAILABLE, 'All data sources failed', {
      source: 'FailoverManager',
      retryable: true,
      details: { errors }
    });
  }
}
