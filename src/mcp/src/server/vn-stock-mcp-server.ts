import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { 
  VNStockServerConfig, 
  DataSourceType, 
  StockData, 
  MarketData, 
  CompanyInfo,
  AnalysisRequest,
  AnalysisResult,
  VN_STOCK_TOOLS,
  VN_STOCK_RESOURCE_PATTERNS
} from "../types/index.js";
import { DataProviderManager } from "./data-provider-manager.js";
import { CacheManager } from "./cache-manager.js";
import { ConfigManager } from "./config-manager.js";

export class VNStockMCPServer {
  private server: McpServer;
  private dataProviderManager: DataProviderManager;
  private cacheManager: CacheManager;
  private configManager: ConfigManager;
  private config: VNStockServerConfig;

  constructor(config: VNStockServerConfig) {
    this.config = config;
    this.server = new McpServer({
      name: config.name,
      version: config.version
    });

    this.configManager = new ConfigManager();
    this.cacheManager = new CacheManager();
    this.dataProviderManager = new DataProviderManager(this.configManager, this.cacheManager);

    this.setupResources();
    this.setupTools();
    this.setupPrompts();
    this.setupErrorHandling();
  }

  private setupResources(): void {
    // Stock information resources
    this.server.resource(
      "stock-info",
      new ResourceTemplate(VN_STOCK_RESOURCE_PATTERNS.STOCK_INFO, { list: undefined }),
      async (uri, { symbol }) => this.getStockResource(symbol as string)
    );

    // Stock financial data resources
    this.server.resource(
      "stock-financials",
      new ResourceTemplate(VN_STOCK_RESOURCE_PATTERNS.STOCK_FINANCIALS, { list: undefined }),
      async (uri, { symbol }) => this.getStockFinancialsResource(symbol as string)
    );

    // Stock news resources
    this.server.resource(
      "stock-news",
      new ResourceTemplate(VN_STOCK_RESOURCE_PATTERNS.STOCK_NEWS, { list: undefined }),
      async (uri, { symbol }) => this.getStockNewsResource(symbol as string)
    );

    // Market index resources
    this.server.resource(
      "market-index",
      new ResourceTemplate(VN_STOCK_RESOURCE_PATTERNS.MARKET_INDEX, { list: undefined }),
      async (uri, { index }) => this.getMarketIndexResource(index as string)
    );

    // Sector data resources
    this.server.resource(
      "sector-data",
      new ResourceTemplate(VN_STOCK_RESOURCE_PATTERNS.SECTOR_DATA, { list: undefined }),
      async (uri, { sector }) => this.getSectorDataResource(sector as string)
    );

    // Analysis resources
    this.server.resource(
      "analysis",
      new ResourceTemplate(VN_STOCK_RESOURCE_PATTERNS.ANALYSIS, { list: undefined }),
      async (uri, { symbol, type }) => this.getAnalysisResource(symbol as string, type as string)
    );
  }

  private setupTools(): void {
    // Real-time stock price tool
    this.server.tool(
      VN_STOCK_TOOLS.GET_STOCK_PRICE,
      {
        symbol: z.string().min(2).max(10).describe("Stock symbol (e.g., VCB, VIC)"),
        exchange: z.enum(['HOSE', 'HNX', 'UPCOM']).optional().describe("Stock exchange")
      },
      async ({ symbol, exchange }) => this.getStockPriceTool(symbol, exchange)
    );

    // Financial report tool
    this.server.tool(
      VN_STOCK_TOOLS.GET_FINANCIAL_REPORT,
      {
        symbol: z.string().min(2).max(10).describe("Stock symbol"),
        period: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'FY']).optional().describe("Financial period"),
        year: z.number().min(2020).max(2030).optional().describe("Report year")
      },
      async ({ symbol, period, year }) => this.getFinancialReportTool(symbol, period, year)
    );

    // Stock analysis tool
    this.server.tool(
      VN_STOCK_TOOLS.ANALYZE_STOCK,
      {
        symbol: z.string().describe("Stock symbol to analyze"),
        analysisType: z.enum(['technical', 'fundamental', 'comprehensive']).describe("Type of analysis"),
        timeframe: z.enum(['1D', '1W', '1M', '3M', '1Y']).optional().describe("Analysis timeframe"),
        includeNews: z.boolean().default(false).describe("Include news analysis"),
        includePeers: z.boolean().default(false).describe("Include peer comparison")
      },
      async (params) => this.analyzeStockTool(params)
    );

    // Stock search tool
    this.server.tool(
      VN_STOCK_TOOLS.SEARCH_STOCKS,
      {
        query: z.string().describe("Search query (symbol, company name, or keyword)"),
        exchange: z.enum(['HOSE', 'HNX', 'UPCOM', 'ALL']).default('ALL').describe("Exchange filter"),
        sector: z.string().optional().describe("Sector filter"),
        limit: z.number().min(1).max(100).default(20).describe("Maximum number of results")
      },
      async ({ query, exchange, sector, limit }) => this.searchStocksTool(query, exchange, sector, limit)
    );

    // Market overview tool
    this.server.tool(
      VN_STOCK_TOOLS.GET_MARKET_OVERVIEW,
      {
        indices: z.array(z.string()).default(['VNINDEX', 'HNXINDEX', 'UPCOMINDEX']).describe("Market indices to include")
      },
      async ({ indices }) => this.getMarketOverviewTool(indices)
    );

    // News tool
    this.server.tool(
      VN_STOCK_TOOLS.GET_NEWS,
      {
        symbol: z.string().optional().describe("Stock symbol for company-specific news"),
        category: z.enum(['market', 'company', 'sector', 'all']).default('all').describe("News category"),
        limit: z.number().min(1).max(50).default(10).describe("Number of news items"),
        timeframe: z.enum(['1D', '1W', '1M']).default('1D').describe("News timeframe")
      },
      async ({ symbol, category, limit, timeframe }) => this.getNewsTool(symbol, category, limit, timeframe)
    );
  }

  private setupPrompts(): void {
    // Stock analysis prompt
    this.server.prompt(
      "analyze-vietnamese-stock",
      {
        symbol: z.string().describe("Vietnamese stock symbol to analyze"),
        analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed').describe("Analysis depth")
      },
      ({ symbol, analysisDepth }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please provide a ${analysisDepth} analysis of Vietnamese stock ${symbol}. Include current price, financial metrics, technical indicators, and market sentiment. Consider the Vietnamese market context and regulatory environment.`
          }
        }]
      })
    );

    // Market overview prompt
    this.server.prompt(
      "vietnamese-market-overview",
      {
        timeframe: z.enum(['daily', 'weekly', 'monthly']).default('daily').describe("Market overview timeframe")
      },
      ({ timeframe }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Provide a comprehensive ${timeframe} overview of the Vietnamese stock market. Include VN-Index performance, sector analysis, top gainers/losers, market sentiment, and key economic factors affecting the market.`
          }
        }]
      })
    );
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("VN Stock MCP Server error:", error);
      // Log to monitoring system if available
    };
  }

  // Resource handlers
  private async getStockResource(symbol: string) {
    try {
      const stockData = await this.dataProviderManager.getStockData(symbol);
      
      return {
        contents: [{
          uri: `stock://${symbol}`,
          text: JSON.stringify(stockData, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch stock data for ${symbol}: ${error.message}`);
    }
  }

  private async getStockFinancialsResource(symbol: string) {
    try {
      const financialData = await this.dataProviderManager.getFinancialData(symbol);
      
      return {
        contents: [{
          uri: `stock://${symbol}/financials`,
          text: JSON.stringify(financialData, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch financial data for ${symbol}: ${error.message}`);
    }
  }

  private async getStockNewsResource(symbol: string) {
    try {
      const newsData = await this.dataProviderManager.getStockNews(symbol);
      
      return {
        contents: [{
          uri: `stock://${symbol}/news`,
          text: JSON.stringify(newsData, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch news for ${symbol}: ${error.message}`);
    }
  }

  private async getMarketIndexResource(index: string) {
    try {
      const marketData = await this.dataProviderManager.getMarketData(index);
      
      return {
        contents: [{
          uri: `market://${index}`,
          text: JSON.stringify(marketData, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch market data for ${index}: ${error.message}`);
    }
  }

  private async getSectorDataResource(sector: string) {
    try {
      const sectorData = await this.dataProviderManager.getSectorData(sector);
      
      return {
        contents: [{
          uri: `sector://${sector}`,
          text: JSON.stringify(sectorData, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch sector data for ${sector}: ${error.message}`);
    }
  }

  private async getAnalysisResource(symbol: string, type: string) {
    try {
      const analysisData = await this.dataProviderManager.getAnalysis(symbol, type);
      
      return {
        contents: [{
          uri: `analysis://${symbol}/${type}`,
          text: JSON.stringify(analysisData, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch analysis for ${symbol}: ${error.message}`);
    }
  }

  // Tool handlers implementation
  private async getStockPriceTool(symbol: string, exchange?: string) {
    try {
      const stockData = await this.dataProviderManager.getStockData(symbol);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            symbol: stockData.symbol,
            exchange: stockData.exchange,
            price: stockData.price,
            change: stockData.change,
            changePercent: stockData.changePercent,
            volume: stockData.volume,
            timestamp: stockData.timestamp,
            source: stockData.source
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to fetch price data for ${symbol}: ${error.message}`
        }],
        isError: true
      };
    }
  }

  private async getFinancialReportTool(symbol: string, period?: string, year?: number) {
    try {
      const financialData = await this.dataProviderManager.getFinancialData(symbol, period);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            symbol: financialData.symbol,
            period: financialData.period,
            year: financialData.year,
            revenue: financialData.revenue,
            netIncome: financialData.netIncome,
            eps: financialData.eps,
            roe: financialData.roe,
            roa: financialData.roa,
            source: financialData.source
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to fetch financial report for ${symbol}: ${error.message}`
        }],
        isError: true
      };
    }
  }

  private async analyzeStockTool(params: AnalysisRequest) {
    try {
      const analysis = await this.dataProviderManager.getAnalysis(params.symbol, params.analysisType);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            symbol: analysis.symbol,
            analysisType: analysis.analysisType,
            recommendation: analysis.recommendation,
            confidence: analysis.confidence,
            summary: analysis.summary,
            timestamp: analysis.timestamp,
            sources: analysis.sources
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to analyze stock ${params.symbol}: ${error.message}`
        }],
        isError: true
      };
    }
  }

  private async searchStocksTool(query: string, exchange: string, sector?: string, limit?: number) {
    try {
      // Mock implementation for now
      const results = [
        { symbol: "VCB", name: "Vietcombank", exchange: "HOSE", sector: "Banking" },
        { symbol: "VIC", name: "Vingroup", exchange: "HOSE", sector: "Real Estate" }
      ].filter(stock =>
        stock.symbol.includes(query.toUpperCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit || 20);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            query,
            results,
            total: results.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to search stocks: ${error.message}`
        }],
        isError: true
      };
    }
  }

  private async getMarketOverviewTool(indices: string[]) {
    try {
      const marketData = await Promise.all(
        indices.map(index => this.dataProviderManager.getMarketData(index))
      );

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            indices: marketData.map(data => ({
              index: data.index,
              value: data.value,
              change: data.change,
              changePercent: data.changePercent,
              volume: data.volume,
              timestamp: data.timestamp
            })),
            timestamp: new Date()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to fetch market overview: ${error.message}`
        }],
        isError: true
      };
    }
  }

  private async getNewsTool(symbol?: string, category?: string, limit?: number, timeframe?: string) {
    try {
      let news;
      if (symbol) {
        news = await this.dataProviderManager.getStockNews(symbol, limit || 10);
      } else {
        // Mock general news implementation
        news = [
          {
            title: "Vietnamese stock market shows positive momentum",
            content: "Market analysis indicates...",
            timestamp: new Date(),
            category: category || 'market'
          }
        ];
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            symbol,
            category,
            timeframe,
            news,
            total: news.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to fetch news: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async connect(transport: StdioServerTransport | StreamableHTTPServerTransport): Promise<void> {
    await this.server.connect(transport);
  }

  async close(): Promise<void> {
    await this.server.close();
  }
}
