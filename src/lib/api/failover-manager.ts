import { BaseApiClient, ApiResponse } from './base-client';

/**
 * FailoverManager - Cơ chế chuyển đổi dự phòng giữa nhiều nguồn dữ liệu
 * Thử lần lượt các API client cho tới khi nhận được kết quả thành công
 */
export class FailoverManager {
  constructor(private clients: BaseApiClient[] = []) {}

  /** Thay đổi danh sách client ưu tiên */
  updateClients(clients: BaseApiClient[]): void {
    this.clients = clients;
  }

  /**
   * Thực thi một hành động với cơ chế failover
   * @param operation Hàm thực thi trên từng client
   */
  private async executeWithFailover<T>(operation: (client: BaseApiClient) => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    let lastError: any;
    for (const client of this.clients) {
      try {
        const result = await operation(client);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error ? error.message : error;
      }
    }
    throw new Error(`All data sources failed: ${lastError}`);
  }

  getStockInfo(stockCode: string) {
    return this.executeWithFailover(c => c.getStockInfo(stockCode));
  }

  getRealTimePrice(stockCode: string) {
    return this.executeWithFailover(c => c.getRealTimePrice(stockCode));
  }

  getOrderBook(stockCode: string) {
    return this.executeWithFailover(c => c.getOrderBook(stockCode));
  }

  getTradeTicks(stockCode: string, limit?: number) {
    return this.executeWithFailover(c => c.getTradeTicks(stockCode, limit));
  }

  getFinancialReport(stockCode: string, year: number, quarter?: number) {
    return this.executeWithFailover(c => c.getFinancialReport(stockCode, year, quarter));
  }

  getMarketIndex(indexCode: string) {
    return this.executeWithFailover(c => c.getMarketIndex(indexCode));
  }
}
