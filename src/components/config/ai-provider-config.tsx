'use client';

/**
 * @fileOverview AI Provider Configuration Component
 * Component để cấu hình các nhà cung cấp AI
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Settings,
  Key,
  Brain,
  Zap
} from 'lucide-react';

import { AIProvider, AIModel, AIConfig } from '@/lib/ai/types';
import { AIConfigManager } from '@/lib/ai/config-manager';
import { APIKeyManager } from '@/lib/ai/api-key-manager';
import { ALL_MODEL_CONFIGS, PROVIDER_MODELS } from '@/lib/ai/model-configs';

interface AIProviderConfigProps {
  onConfigChange?: (config: AIConfig) => void;
}

export function AIProviderConfig({ onConfigChange }: AIProviderConfigProps) {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [apiKeyStatuses, setApiKeyStatuses] = useState<Map<AIProvider, any>>(new Map());
  const [showApiKeys, setShowApiKeys] = useState<Map<AIProvider, boolean>>(new Map());
  const [validatingKeys, setValidatingKeys] = useState<Set<AIProvider>>(new Set());
  const [loading, setLoading] = useState(true);

  const configManager = AIConfigManager.getInstance();
  const apiKeyManager = APIKeyManager.getInstance();

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const currentConfig = configManager.getConfig();
      setConfig(currentConfig);

      // Load API key statuses
      const statuses = new Map();
      for (const provider of Object.values(AIProvider)) {
        const status = apiKeyManager.getApiKeyStatus(provider);
        statuses.set(provider, status);
      }
      setApiKeyStatuses(statuses);

      onConfigChange?.(currentConfig);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    configManager.setCurrentProvider(provider);
    loadConfiguration();
  };

  const handleModelChange = (model: AIModel) => {
    configManager.setCurrentModel(model);
    loadConfiguration();
  };

  const handleApiKeyChange = async (provider: AIProvider, apiKey: string) => {
    if (!apiKey.trim()) return;

    setValidatingKeys(prev => new Set(prev).add(provider));
    
    try {
      const result = await apiKeyManager.setApiKey(provider, apiKey);
      
      // Update status
      setApiKeyStatuses(prev => {
        const newStatuses = new Map(prev);
        newStatuses.set(provider, {
          hasKey: true,
          isValid: result.isValid,
          error: result.error,
        });
        return newStatuses;
      });

      if (result.isValid) {
        loadConfiguration(); // Reload to update available providers
      }
    } catch (error) {
      console.error('API key validation failed:', error);
    } finally {
      setValidatingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(provider);
        return newSet;
      });
    }
  };

  const toggleApiKeyVisibility = (provider: AIProvider) => {
    setShowApiKeys(prev => {
      const newMap = new Map(prev);
      newMap.set(provider, !newMap.get(provider));
      return newMap;
    });
  };

  const validateAllApiKeys = async () => {
    setValidatingKeys(new Set(Object.values(AIProvider)));
    
    try {
      const results = await apiKeyManager.validateAllApiKeys();
      
      const newStatuses = new Map();
      for (const [provider, result] of results) {
        newStatuses.set(provider, {
          hasKey: true,
          isValid: result.isValid,
          error: result.error,
        });
      }
      setApiKeyStatuses(newStatuses);
      
      loadConfiguration();
    } catch (error) {
      console.error('Bulk validation failed:', error);
    } finally {
      setValidatingKeys(new Set());
    }
  };

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case AIProvider.GOOGLE_GEMINI:
        return <Brain className="h-4 w-4" />;
      case AIProvider.OPENAI_GPT:
        return <Zap className="h-4 w-4" />;
      case AIProvider.PERPLEXITY:
        return <Settings className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: any) => {
    if (!status.hasKey) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    if (status.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getProviderDisplayName = (provider: AIProvider) => {
    switch (provider) {
      case AIProvider.GOOGLE_GEMINI:
        return 'Google Gemini';
      case AIProvider.OPENAI_GPT:
        return 'OpenAI GPT';
      case AIProvider.PERPLEXITY:
        return 'Perplexity AI';
      case AIProvider.ANTHROPIC_CLAUDE:
        return 'Anthropic Claude';
      default:
        return provider;
    }
  };

  const getModelDisplayName = (model: AIModel) => {
    const modelConfig = ALL_MODEL_CONFIGS[model];
    return modelConfig?.displayName || model;
  };

  if (loading || !config) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Đang tải cấu hình...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Cấu hình AI Provider
          </CardTitle>
          <CardDescription>
            Quản lý các nhà cung cấp AI và API keys cho hệ thống phân tích cổ phiếu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="providers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="providers">Nhà cung cấp</TabsTrigger>
              <TabsTrigger value="models">Mô hình</TabsTrigger>
              <TabsTrigger value="settings">Cài đặt</TabsTrigger>
            </TabsList>

            <TabsContent value="providers" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">API Keys</h3>
                <Button 
                  onClick={validateAllApiKeys}
                  disabled={validatingKeys.size > 0}
                  variant="outline"
                  size="sm"
                >
                  {validatingKeys.size > 0 ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Kiểm tra tất cả
                </Button>
              </div>

              <div className="grid gap-4">
                {Object.values(AIProvider).map((provider) => {
                  const status = apiKeyStatuses.get(provider);
                  const isValidating = validatingKeys.has(provider);
                  const showKey = showApiKeys.get(provider) || false;

                  return (
                    <Card key={provider} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getProviderIcon(provider)}
                          <span className="font-medium">
                            {getProviderDisplayName(provider)}
                          </span>
                          {getStatusIcon(status)}
                        </div>
                        <Badge variant={status?.isValid ? "default" : "secondary"}>
                          {status?.isValid ? "Hoạt động" : "Chưa cấu hình"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`apikey-${provider}`}>API Key</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`apikey-${provider}`}
                            type={showKey ? "text" : "password"}
                            placeholder="Nhập API key..."
                            onBlur={(e) => handleApiKeyChange(provider, e.target.value)}
                            disabled={isValidating}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => toggleApiKeyVisibility(provider)}
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        
                        {status?.error && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{status.error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-provider">Nhà cung cấp hiện tại</Label>
                  <Select
                    value={config.currentProvider}
                    onValueChange={(value) => handleProviderChange(value as AIProvider)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AIProvider).map((provider) => {
                        const status = apiKeyStatuses.get(provider);
                        return (
                          <SelectItem 
                            key={provider} 
                            value={provider}
                            disabled={!status?.isValid}
                          >
                            <div className="flex items-center gap-2">
                              {getProviderIcon(provider)}
                              {getProviderDisplayName(provider)}
                              {status?.isValid && <CheckCircle className="h-3 w-3 text-green-500" />}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="current-model">Mô hình hiện tại</Label>
                  <Select
                    value={config.currentModel}
                    onValueChange={(value) => handleModelChange(value as AIModel)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_MODELS[config.currentProvider]?.map((model) => (
                        <SelectItem key={model} value={model}>
                          {getModelDisplayName(model)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.currentModel && ALL_MODEL_CONFIGS[config.currentModel] && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Thông tin mô hình</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{ALL_MODEL_CONFIGS[config.currentModel].description}</p>
                      <div className="flex gap-4 mt-2">
                        <span>Max tokens: {ALL_MODEL_CONFIGS[config.currentModel].maxTokens}</span>
                        <span>Streaming: {ALL_MODEL_CONFIGS[config.currentModel].supportsStreaming ? '✓' : '✗'}</span>
                        <span>Tools: {ALL_MODEL_CONFIGS[config.currentModel].supportsTools ? '✓' : '✗'}</span>
                        <span>Vision: {ALL_MODEL_CONFIGS[config.currentModel].supportsVision ? '✓' : '✗'}</span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bật logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Ghi log các request AI để debug
                    </p>
                  </div>
                  <Switch
                    checked={config.general.enableLogging}
                    onCheckedChange={(checked) => {
                      const updatedConfig = { ...config };
                      updatedConfig.general.enableLogging = checked;
                      setConfig(updatedConfig);
                      onConfigChange?.(updatedConfig);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bật caching</Label>
                    <p className="text-sm text-muted-foreground">
                      Cache kết quả để tăng tốc độ
                    </p>
                  </div>
                  <Switch
                    checked={config.general.enableCaching}
                    onCheckedChange={(checked) => {
                      const updatedConfig = { ...config };
                      updatedConfig.general.enableCaching = checked;
                      setConfig(updatedConfig);
                      onConfigChange?.(updatedConfig);
                    }}
                  />
                </div>

                <div>
                  <Label>Cache timeout (giây)</Label>
                  <div className="mt-2">
                    <Slider
                      value={[config.general.cacheTimeout / 1000]}
                      onValueChange={([value]) => {
                        const updatedConfig = { ...config };
                        updatedConfig.general.cacheTimeout = value * 1000;
                        setConfig(updatedConfig);
                        onConfigChange?.(updatedConfig);
                      }}
                      max={3600}
                      min={60}
                      step={60}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>1 phút</span>
                      <span>{Math.round(config.general.cacheTimeout / 1000 / 60)} phút</span>
                      <span>60 phút</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
