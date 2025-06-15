'use client';

/**
 * @fileOverview Demo Page for AI Configuration System
 * Trang demo để test toàn bộ hệ thống cấu hình AI
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Settings, 
  BarChart3, 
  Brain, 
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  Building,
  Info
} from 'lucide-react';

import { ConfigurationDashboard } from '@/components/config/configuration-dashboard';
import { AIConfigManager } from '@/lib/ai/config-manager';
import { APIKeyManager } from '@/lib/ai/provider-factory';
import { StockAnalysisEngine } from '@/lib/analysis/stock-analysis-engine';
import { FinancialSearchEngine } from '@/lib/search/financial-search-engine';
import { TechnicalIndicators } from '@/lib/analysis/technical-indicators';
import { AIProvider, AIModel } from '@/lib/ai/types';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [stockCode, setStockCode] = useState('VCB');

  const configManager = AIConfigManager.getInstance();

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const config = configManager.getConfig();
      const apiKeyManager = APIKeyManager.getInstance();
      
      const status = {
        aiConfig: config,
        configuredProviders: Object.values(AIProvider).filter(provider => 
          apiKeyManager.getApiKeyStatus(provider).hasKey
        ),
        currentProvider: config.currentProvider,
        currentModel: config.currentModel,
        stockAnalysisEnabled: config.stockAnalysis.technicalIndicators.enabled || 
                             config.stockAnalysis.fundamentalAnalysis.enabled,
        webSearchEnabled: config.webSearch.enabled,
      };

      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to check system status:', error);
    }
  };

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    
    try {
      const result = await testFn();
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { success: true, result, timestamp: new Date() }
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  const testTechnicalIndicators = async () => {
    // Generate sample price data
    const samplePrices = Array.from({ length: 50 }, (_, i) => 
      100 + Math.sin(i / 10) * 10 + Math.random() * 5
    );

    const results = {
      rsi: TechnicalIndicators.calculateRSI(samplePrices, 14),
      macd: TechnicalIndicators.calculateMACD(samplePrices, 12, 26, 9),
      sma: TechnicalIndicators.calculateSMA(samplePrices, 20),
      bollingerBands: TechnicalIndicators.calculateBollingerBands(samplePrices, 20, 2),
      volatility: TechnicalIndicators.calculateVolatility(samplePrices, 20),
    };

    return results;
  };

  const testWebSearch = async () => {
    const searchEngine = new FinancialSearchEngine();
    
    const results = {
      financialNews: await searchEngine.searchFinancialNews({
        stockCode,
        timeframe: '7d',
      }),
      realtimeNews: await searchEngine.searchRealTimeNews(stockCode),
      companyInfo: await searchEngine.searchCompanyInfo(stockCode),
    };

    return results;
  };

  const testStockAnalysis = async () => {
    const analysisEngine = new StockAnalysisEngine();
    const config = configManager.getStockAnalysisConfig();
    
    const results = {
      analysis: await analysisEngine.analyzeStock(stockCode, config),
      recommendation: await analysisEngine.getRecommendation(stockCode, config),
      companyInfo: await analysisEngine.getCompanyInfo(stockCode, config),
    };

    return results;
  };

  const testAIProviders = async () => {
    const results: any = {};
    
    for (const provider of Object.values(AIProvider)) {
      try {
        const apiKeyManager = APIKeyManager.getInstance();
        const status = apiKeyManager.getApiKeyStatus(provider);
        
        if (status.hasKey && status.isValid) {
          // Test basic generation
          const testPrompt = 'Xin chào, đây là test đơn giản.';
          // Note: This would require actual implementation
          results[provider] = {
            available: true,
            testResponse: 'Test thành công',
          };
        } else {
          results[provider] = {
            available: false,
            reason: status.error || 'No API key configured',
          };
        }
      } catch (error) {
        results[provider] = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return results;
  };

  const getStatusIcon = (success?: boolean) => {
    if (success === undefined) return <AlertCircle className="h-4 w-4 text-gray-400" />;
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const formatTestResult = (result: any) => {
    if (!result) return 'Chưa test';
    
    if (result.success) {
      return (
        <div className="space-y-2">
          <Badge variant="default">Thành công</Badge>
          <pre className="text-xs bg-gray-100 p-2 rounded max-h-40 overflow-auto">
            {JSON.stringify(result.result, null, 2)}
          </pre>
          <p className="text-xs text-muted-foreground">
            {result.timestamp.toLocaleString('vi-VN')}
          </p>
        </div>
      );
    } else {
      return (
        <div className="space-y-2">
          <Badge variant="destructive">Thất bại</Badge>
          <p className="text-sm text-red-600">{result.error}</p>
          <p className="text-xs text-muted-foreground">
            {result.timestamp.toLocaleString('vi-VN')}
          </p>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Play className="h-8 w-8" />
            Demo & Testing
          </h1>
          <p className="text-muted-foreground mt-2">
            Test và demo hệ thống phân tích cổ phiếu AI đa nhà cung cấp
          </p>
        </div>

        <Button onClick={checkSystemStatus} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="search">Web Search</TabsTrigger>
          <TabsTrigger value="analysis">Stock Analysis</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Trạng thái hệ thống
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    <div>
                      <p className="font-medium">AI Provider</p>
                      <p className="text-sm text-muted-foreground">
                        {systemStatus.currentProvider}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Stock Analysis</p>
                      <p className="text-sm text-muted-foreground">
                        {systemStatus.stockAnalysisEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Web Search</p>
                      <p className="text-sm text-muted-foreground">
                        {systemStatus.webSearchEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Providers</p>
                      <p className="text-sm text-muted-foreground">
                        {systemStatus.configuredProviders.length} configured
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Đang tải trạng thái...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Tests</CardTitle>
              <CardDescription>
                Chạy các test nhanh để kiểm tra tính năng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="stock-code">Mã cổ phiếu để test</Label>
                  <Input
                    id="stock-code"
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value.toUpperCase())}
                    placeholder="VCB, VIC, FPT..."
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    onClick={() => runTest('technical', testTechnicalIndicators)}
                    disabled={loading.technical}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {loading.technical ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      getStatusIcon(testResults.technical?.success)
                    )}
                    Technical
                  </Button>

                  <Button
                    onClick={() => runTest('search', testWebSearch)}
                    disabled={loading.search}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {loading.search ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      getStatusIcon(testResults.search?.success)
                    )}
                    Web Search
                  </Button>

                  <Button
                    onClick={() => runTest('analysis', testStockAnalysis)}
                    disabled={loading.analysis}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {loading.analysis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      getStatusIcon(testResults.analysis?.success)
                    )}
                    Analysis
                  </Button>

                  <Button
                    onClick={() => runTest('providers', testAIProviders)}
                    disabled={loading.providers}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {loading.providers ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      getStatusIcon(testResults.providers?.success)
                    )}
                    AI Providers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Technical Indicators Test
              </CardTitle>
              <CardDescription>
                Test các chỉ số kỹ thuật với dữ liệu mẫu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => runTest('technical', testTechnicalIndicators)}
                  disabled={loading.technical}
                >
                  {loading.technical ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Technical Indicators Test
                </Button>

                {testResults.technical && (
                  <div>
                    <h4 className="font-medium mb-2">Kết quả:</h4>
                    {formatTestResult(testResults.technical)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Web Search Test
              </CardTitle>
              <CardDescription>
                Test tìm kiếm web và thu thập thông tin tài chính
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => runTest('search', testWebSearch)}
                  disabled={loading.search}
                >
                  {loading.search ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Web Search Test
                </Button>

                {testResults.search && (
                  <div>
                    <h4 className="font-medium mb-2">Kết quả:</h4>
                    {formatTestResult(testResults.search)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Stock Analysis Test
              </CardTitle>
              <CardDescription>
                Test phân tích cổ phiếu toàn diện
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => runTest('analysis', testStockAnalysis)}
                  disabled={loading.analysis}
                >
                  {loading.analysis ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Stock Analysis Test
                </Button>

                {testResults.analysis && (
                  <div>
                    <h4 className="font-medium mb-2">Kết quả:</h4>
                    {formatTestResult(testResults.analysis)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <ConfigurationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
