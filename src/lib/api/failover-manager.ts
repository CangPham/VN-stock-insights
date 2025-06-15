/**
 * @fileOverview Failover Manager - Cơ chế chuyển đổi dự phòng cho API clients
 * Thử lần lượt các nguồn dữ liệu khi một nguồn không khả dụng
 */

import type { BaseApiClient, ApiResponse } from './base-client';
import { globalErrorHandler } from './error-handler';

export class FailoverManager {
  private clients: BaseApiClient[] = [];

  constructor(clients: BaseApiClient[] = []) {
    this.clients = clients;
  }

  /**
   * Thêm API client vào danh sách dự phòng theo thứ tự ưu tiên
   */
  public addClient(client: BaseApiClient): void {
    this.clients.push(client);
  }

  /**
   * Thực hiện yêu cầu với cơ chế failover. Truyền vào hàm callback
   * để gọi phương thức mong muốn trên từng client.
   */
  public async execute<T>(
    operation: (client: BaseApiClient) => Promise<ApiResponse<T>>
  ): Promise<ApiResponse<T>> {
    const errors: any[] = [];

    for (const client of this.clients) {
      try {
        const result = await operation(client);
        if (result.success) {
          return result;
        }
        errors.push(result.error);
      } catch (error) {
        const apiError = globalErrorHandler.normalizeError(error, {
          source: client.constructor.name
        });
        globalErrorHandler.handleWithRetry(async () => {
          throw apiError;
        }, { source: client.constructor.name }).catch(() => {});
        errors.push(apiError.message);
      }
    }

    throw new Error(`All data sources failed: ${errors.join('; ')}`);
  }
}

