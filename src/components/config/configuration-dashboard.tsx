'use client';

/**
 * @fileOverview Configuration Dashboard
 * Dashboard tổng hợp để quản lý tất cả cấu hình hệ thống
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Brain, 
  BarChart3, 
  Search, 
  Download, 
  Upload, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

import { AIProviderConfig } from './ai-provider-config';
import { StockAnalysisConfigComponent } from './stock-analysis-config';
import { AIConfig, StockAnalysisConfig, WebSearchConfig } from '@/lib/ai/types';
import { AIConfigManager } from '@/lib/ai/config-manager';
import { envLoader } from '@/lib/ai/env-loader';

export function ConfigurationDashboard() {
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [stockAnalysisConfig, setStockAnalysisConfig] = useState<StockAnalysisConfig | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const configManager = AIConfigManager.getInstance();

  useEffect(() => {
    loadAllConfigurations();
    checkSystemStatus();
  }, []);

  const loadAllConfigurations = async () => {
    try {
      setLoading(true);
      const ai = configManager.getConfig();
      const stockAnalysis = configManager.getStockAnalysisConfig();
      
      setAiConfig(ai);
      setStockAnalysisConfig(stockAnalysis);
    } catch (error) {
      console.error('Failed to load configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemStatus = () => {
    const envStatus = envLoader.validateEnvironmentSetup();
    setSystemStatus(envStatus);
  };

  const exportConfiguration = () => {
    const config = {
      ai: aiConfig,
      stockAnalysis: stockAnalysisConfig,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vn-stock-insights-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        
        if (config.ai) {
          configManager.importConfig(JSON.stringify(config.ai));
        }
        
        if (config.stockAnalysis) {
          configManager.updateStockAnalysisConfig(config.stockAnalysis);
        }

        loadAllConfigurations();
        
        alert('Cấu hình đã được import thành công!');
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import thất bại. Vui lòng kiểm tra file cấu hình.');
      }
    };
    reader.readAsText(file);
  };

  const resetToDefaults = () => {
    if (confirm('Bạn có chắc chắn muốn reset tất cả cấu hình về mặc định?')) {
      configManager.resetToDefaults();
      loadAllConfigurations();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Đang tải cấu hình...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Cấu hình hệ thống
          </h1>
          <p className="text-muted-foreground mt-2">
            Quản lý cấu hình AI, phân tích cổ phiếu và tìm kiếm web
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={exportConfiguration} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" asChild>
            <label htmlFor="import-config" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </label>
          </Button>
          <input
            id="import-config"
            type="file"
            accept=".json"
            onChange={importConfiguration}
            className="hidden"
          />

          <Button onClick={resetToDefaults} variant="destructive">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Trạng thái hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {systemStatus.hasAnyProvider ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">AI Providers</p>
                  <p className="text-sm text-muted-foreground">
                    {systemStatus.configuredProviders.length} đã cấu hình
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {systemStatus.webSearchProviders.length > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">Web Search</p>
                  <p className="text-sm text-muted-foreground">
                    {systemStatus.webSearchProviders.length} providers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Phân tích cổ phiếu</p>
                  <p className="text-sm text-muted-foreground">
                    Đã cấu hình
                  </p>
                </div>
              </div>
            </div>

            {systemStatus.recommendations.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Khuyến nghị:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {systemStatus.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Tabs */}
      <Tabs defaultValue="ai-providers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-providers" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Providers
          </TabsTrigger>
          <TabsTrigger value="stock-analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Phân tích cổ phiếu
          </TabsTrigger>
          <TabsTrigger value="web-search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Tìm kiếm web
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Nâng cao
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-providers">
          <AIProviderConfig onConfigChange={setAiConfig} />
        </TabsContent>

        <TabsContent value="stock-analysis">
          <StockAnalysisConfigComponent onConfigChange={setStockAnalysisConfig} />
        </TabsContent>

        <TabsContent value="web-search">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Cấu hình tìm kiếm web
              </CardTitle>
              <CardDescription>
                Cấu hình các nhà cung cấp tìm kiếm web cho thông tin thời gian thực
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Tính năng cấu hình tìm kiếm web sẽ được triển khai trong phiên bản tiếp theo.
                    Hiện tại, hệ thống sử dụng cấu hình từ environment variables.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Google Custom Search</h4>
                      <p className="text-sm text-muted-foreground">
                        Tìm kiếm thông qua Google Custom Search API
                      </p>
                    </div>
                    <Badge variant={systemStatus?.webSearchProviders.includes('google') ? 'default' : 'secondary'}>
                      {systemStatus?.webSearchProviders.includes('google') ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Serper API</h4>
                      <p className="text-sm text-muted-foreground">
                        Alternative Google Search API
                      </p>
                    </div>
                    <Badge variant={systemStatus?.webSearchProviders.includes('serper') ? 'default' : 'secondary'}>
                      {systemStatus?.webSearchProviders.includes('serper') ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Tavily Search</h4>
                      <p className="text-sm text-muted-foreground">
                        AI-powered search API
                      </p>
                    </div>
                    <Badge variant={systemStatus?.webSearchProviders.includes('tavily') ? 'default' : 'secondary'}>
                      {systemStatus?.webSearchProviders.includes('tavily') ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt nâng cao</CardTitle>
              <CardDescription>
                Các cài đặt hệ thống và debug
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Thông tin phiên bản</h4>
                    <div className="text-sm space-y-1">
                      <p>Version: 1.0.0</p>
                      <p>Build: {new Date().toISOString().split('T')[0]}</p>
                      <p>Environment: {process.env.NODE_ENV}</p>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Thống kê cấu hình</h4>
                    <div className="text-sm space-y-1">
                      <p>AI Providers: {systemStatus?.configuredProviders.length || 0}</p>
                      <p>Search Providers: {systemStatus?.webSearchProviders.length || 0}</p>
                      <p>Last Updated: {new Date().toLocaleString('vi-VN')}</p>
                    </div>
                  </Card>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Lưu ý:</strong> Các thay đổi cấu hình sẽ được lưu tự động trong localStorage 
                    và có hiệu lực ngay lập tức. Để đồng bộ cấu hình giữa các thiết bị, 
                    hãy sử dụng tính năng Export/Import.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button onClick={checkSystemStatus} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Kiểm tra lại trạng thái
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }} 
                    variant="destructive"
                  >
                    Xóa tất cả dữ liệu local
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
