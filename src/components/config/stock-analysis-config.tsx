'use client';

/**
 * @fileOverview Stock Analysis Configuration Component
 * Component để cấu hình các thông số phân tích cổ phiếu
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  BarChart3, 
  Heart, 
  Shield, 
  Target,
  Settings,
  Info
} from 'lucide-react';

import { StockAnalysisConfig } from '@/lib/ai/types';
import { AIConfigManager } from '@/lib/ai/config-manager';

interface StockAnalysisConfigProps {
  onConfigChange?: (config: StockAnalysisConfig) => void;
}

export function StockAnalysisConfigComponent({ onConfigChange }: StockAnalysisConfigProps) {
  const [config, setConfig] = useState<StockAnalysisConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const configManager = AIConfigManager.getInstance();

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    try {
      setLoading(true);
      const currentConfig = configManager.getStockAnalysisConfig();
      setConfig(currentConfig);
      onConfigChange?.(currentConfig);
    } catch (error) {
      console.error('Failed to load stock analysis configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<StockAnalysisConfig>) => {
    if (!config) return;
    
    const updatedConfig = { ...config, ...updates };
    setConfig(updatedConfig);
    configManager.updateStockAnalysisConfig(updates);
    onConfigChange?.(updatedConfig);
  };

  if (loading || !config) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Settings className="h-6 w-6 animate-spin mr-2" />
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
            <BarChart3 className="h-5 w-5" />
            Cấu hình phân tích cổ phiếu
          </CardTitle>
          <CardDescription>
            Tùy chỉnh các thông số phân tích kỹ thuật, cơ bản và đánh giá rủi ro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="technical" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="technical">Kỹ thuật</TabsTrigger>
              <TabsTrigger value="fundamental">Cơ bản</TabsTrigger>
              <TabsTrigger value="sentiment">Tình cảm</TabsTrigger>
              <TabsTrigger value="risk">Rủi ro</TabsTrigger>
              <TabsTrigger value="recommendation">Khuyến nghị</TabsTrigger>
            </TabsList>

            <TabsContent value="technical" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Phân tích kỹ thuật</h3>
                </div>
                <Switch
                  checked={config.technicalIndicators.enabled}
                  onCheckedChange={(enabled) => 
                    updateConfig({
                      technicalIndicators: { ...config.technicalIndicators, enabled }
                    })
                  }
                />
              </div>

              {config.technicalIndicators.enabled && (
                <div className="space-y-6">
                  {/* RSI Configuration */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">RSI (Relative Strength Index)</h4>
                        <p className="text-sm text-muted-foreground">
                          Chỉ số sức mạnh tương đối
                        </p>
                      </div>
                      <Switch
                        checked={config.technicalIndicators.rsi.enabled}
                        onCheckedChange={(enabled) =>
                          updateConfig({
                            technicalIndicators: {
                              ...config.technicalIndicators,
                              rsi: { ...config.technicalIndicators.rsi, enabled }
                            }
                          })
                        }
                      />
                    </div>

                    {config.technicalIndicators.rsi.enabled && (
                      <div className="space-y-4">
                        <div>
                          <Label>Chu kỳ: {config.technicalIndicators.rsi.period}</Label>
                          <Slider
                            value={[config.technicalIndicators.rsi.period]}
                            onValueChange={([period]) =>
                              updateConfig({
                                technicalIndicators: {
                                  ...config.technicalIndicators,
                                  rsi: { ...config.technicalIndicators.rsi, period }
                                }
                              })
                            }
                            min={5}
                            max={50}
                            step={1}
                            className="mt-2"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Mua quá mức: {config.technicalIndicators.rsi.overbought}</Label>
                            <Slider
                              value={[config.technicalIndicators.rsi.overbought]}
                              onValueChange={([overbought]) =>
                                updateConfig({
                                  technicalIndicators: {
                                    ...config.technicalIndicators,
                                    rsi: { ...config.technicalIndicators.rsi, overbought }
                                  }
                                })
                              }
                              min={70}
                              max={90}
                              step={5}
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label>Bán quá mức: {config.technicalIndicators.rsi.oversold}</Label>
                            <Slider
                              value={[config.technicalIndicators.rsi.oversold]}
                              onValueChange={([oversold]) =>
                                updateConfig({
                                  technicalIndicators: {
                                    ...config.technicalIndicators,
                                    rsi: { ...config.technicalIndicators.rsi, oversold }
                                  }
                                })
                              }
                              min={10}
                              max={30}
                              step={5}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* MACD Configuration */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">MACD</h4>
                        <p className="text-sm text-muted-foreground">
                          Moving Average Convergence Divergence
                        </p>
                      </div>
                      <Switch
                        checked={config.technicalIndicators.macd.enabled}
                        onCheckedChange={(enabled) =>
                          updateConfig({
                            technicalIndicators: {
                              ...config.technicalIndicators,
                              macd: { ...config.technicalIndicators.macd, enabled }
                            }
                          })
                        }
                      />
                    </div>

                    {config.technicalIndicators.macd.enabled && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Fast Period: {config.technicalIndicators.macd.fastPeriod}</Label>
                          <Slider
                            value={[config.technicalIndicators.macd.fastPeriod]}
                            onValueChange={([fastPeriod]) =>
                              updateConfig({
                                technicalIndicators: {
                                  ...config.technicalIndicators,
                                  macd: { ...config.technicalIndicators.macd, fastPeriod }
                                }
                              })
                            }
                            min={5}
                            max={20}
                            step={1}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label>Slow Period: {config.technicalIndicators.macd.slowPeriod}</Label>
                          <Slider
                            value={[config.technicalIndicators.macd.slowPeriod]}
                            onValueChange={([slowPeriod]) =>
                              updateConfig({
                                technicalIndicators: {
                                  ...config.technicalIndicators,
                                  macd: { ...config.technicalIndicators.macd, slowPeriod }
                                }
                              })
                            }
                            min={20}
                            max={50}
                            step={1}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label>Signal Period: {config.technicalIndicators.macd.signalPeriod}</Label>
                          <Slider
                            value={[config.technicalIndicators.macd.signalPeriod]}
                            onValueChange={([signalPeriod]) =>
                              updateConfig({
                                technicalIndicators: {
                                  ...config.technicalIndicators,
                                  macd: { ...config.technicalIndicators.macd, signalPeriod }
                                }
                              })
                            }
                            min={5}
                            max={15}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Moving Averages Configuration */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">Moving Averages</h4>
                        <p className="text-sm text-muted-foreground">
                          Đường trung bình động
                        </p>
                      </div>
                      <Switch
                        checked={config.technicalIndicators.movingAverages.enabled}
                        onCheckedChange={(enabled) =>
                          updateConfig({
                            technicalIndicators: {
                              ...config.technicalIndicators,
                              movingAverages: { ...config.technicalIndicators.movingAverages, enabled }
                            }
                          })
                        }
                      />
                    </div>

                    {config.technicalIndicators.movingAverages.enabled && (
                      <div>
                        <Label>Chu kỳ được sử dụng</Label>
                        <div className="flex gap-2 mt-2">
                          {config.technicalIndicators.movingAverages.periods.map((period) => (
                            <Badge key={period} variant="secondary">
                              {period} ngày
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Mặc định: 20, 50, 200 ngày
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Bollinger Bands Configuration */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">Bollinger Bands</h4>
                        <p className="text-sm text-muted-foreground">
                          Dải Bollinger
                        </p>
                      </div>
                      <Switch
                        checked={config.technicalIndicators.bollingerBands.enabled}
                        onCheckedChange={(enabled) =>
                          updateConfig({
                            technicalIndicators: {
                              ...config.technicalIndicators,
                              bollingerBands: { ...config.technicalIndicators.bollingerBands, enabled }
                            }
                          })
                        }
                      />
                    </div>

                    {config.technicalIndicators.bollingerBands.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Chu kỳ: {config.technicalIndicators.bollingerBands.period}</Label>
                          <Slider
                            value={[config.technicalIndicators.bollingerBands.period]}
                            onValueChange={([period]) =>
                              updateConfig({
                                technicalIndicators: {
                                  ...config.technicalIndicators,
                                  bollingerBands: { ...config.technicalIndicators.bollingerBands, period }
                                }
                              })
                            }
                            min={10}
                            max={30}
                            step={1}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label>Độ lệch chuẩn: {config.technicalIndicators.bollingerBands.standardDeviations}</Label>
                          <Slider
                            value={[config.technicalIndicators.bollingerBands.standardDeviations]}
                            onValueChange={([standardDeviations]) =>
                              updateConfig({
                                technicalIndicators: {
                                  ...config.technicalIndicators,
                                  bollingerBands: { ...config.technicalIndicators.bollingerBands, standardDeviations }
                                }
                              })
                            }
                            min={1}
                            max={3}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fundamental" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Phân tích cơ bản</h3>
                </div>
                <Switch
                  checked={config.fundamentalAnalysis.enabled}
                  onCheckedChange={(enabled) => 
                    updateConfig({
                      fundamentalAnalysis: { ...config.fundamentalAnalysis, enabled }
                    })
                  }
                />
              </div>

              {config.fundamentalAnalysis.enabled && (
                <div className="space-y-4">
                  {/* P/E Ratio */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">P/E Ratio</h4>
                        <p className="text-sm text-muted-foreground">
                          Tỷ số giá/thu nhập
                        </p>
                      </div>
                      <Switch
                        checked={config.fundamentalAnalysis.peRatio.enabled}
                        onCheckedChange={(enabled) =>
                          updateConfig({
                            fundamentalAnalysis: {
                              ...config.fundamentalAnalysis,
                              peRatio: { ...config.fundamentalAnalysis.peRatio, enabled }
                            }
                          })
                        }
                      />
                    </div>

                    {config.fundamentalAnalysis.peRatio.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Ngưỡng thấp: {config.fundamentalAnalysis.peRatio.lowThreshold}</Label>
                          <Slider
                            value={[config.fundamentalAnalysis.peRatio.lowThreshold]}
                            onValueChange={([lowThreshold]) =>
                              updateConfig({
                                fundamentalAnalysis: {
                                  ...config.fundamentalAnalysis,
                                  peRatio: { ...config.fundamentalAnalysis.peRatio, lowThreshold }
                                }
                              })
                            }
                            min={5}
                            max={20}
                            step={1}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label>Ngưỡng cao: {config.fundamentalAnalysis.peRatio.highThreshold}</Label>
                          <Slider
                            value={[config.fundamentalAnalysis.peRatio.highThreshold]}
                            onValueChange={([highThreshold]) =>
                              updateConfig({
                                fundamentalAnalysis: {
                                  ...config.fundamentalAnalysis,
                                  peRatio: { ...config.fundamentalAnalysis.peRatio, highThreshold }
                                }
                              })
                            }
                            min={20}
                            max={50}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* ROE */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">ROE</h4>
                        <p className="text-sm text-muted-foreground">
                          Tỷ suất sinh lời trên vốn chủ sở hữu
                        </p>
                      </div>
                      <Switch
                        checked={config.fundamentalAnalysis.roe.enabled}
                        onCheckedChange={(enabled) =>
                          updateConfig({
                            fundamentalAnalysis: {
                              ...config.fundamentalAnalysis,
                              roe: { ...config.fundamentalAnalysis.roe, enabled }
                            }
                          })
                        }
                      />
                    </div>

                    {config.fundamentalAnalysis.roe.enabled && (
                      <div>
                        <Label>Ngưỡng tối thiểu (%): {config.fundamentalAnalysis.roe.minThreshold}</Label>
                        <Slider
                          value={[config.fundamentalAnalysis.roe.minThreshold]}
                          onValueChange={([minThreshold]) =>
                            updateConfig({
                              fundamentalAnalysis: {
                                ...config.fundamentalAnalysis,
                                roe: { ...config.fundamentalAnalysis.roe, minThreshold }
                              }
                            })
                          }
                          min={5}
                          max={30}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sentiment" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Phân tích tình cảm</h3>
                </div>
                <Switch
                  checked={config.sentimentAnalysis.enabled}
                  onCheckedChange={(enabled) => 
                    updateConfig({
                      sentimentAnalysis: { ...config.sentimentAnalysis, enabled }
                    })
                  }
                />
              </div>

              {config.sentimentAnalysis.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label>Khung thời gian</Label>
                    <Select
                      value={config.sentimentAnalysis.timeframe}
                      onValueChange={(timeframe) =>
                        updateConfig({
                          sentimentAnalysis: {
                            ...config.sentimentAnalysis,
                            timeframe: timeframe as any
                          }
                        })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1d">1 ngày</SelectItem>
                        <SelectItem value="7d">7 ngày</SelectItem>
                        <SelectItem value="30d">30 ngày</SelectItem>
                        <SelectItem value="90d">90 ngày</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Trọng số trong quyết định (%): {Math.round(config.sentimentAnalysis.weight * 100)}</Label>
                    <Slider
                      value={[config.sentimentAnalysis.weight]}
                      onValueChange={([weight]) =>
                        updateConfig({
                          sentimentAnalysis: { ...config.sentimentAnalysis, weight }
                        })
                      }
                      min={0}
                      max={1}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="risk" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Đánh giá rủi ro</h3>
                </div>
                <Switch
                  checked={config.riskAssessment.enabled}
                  onCheckedChange={(enabled) => 
                    updateConfig({
                      riskAssessment: { ...config.riskAssessment, enabled }
                    })
                  }
                />
              </div>

              {config.riskAssessment.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label>Mức độ chấp nhận rủi ro</Label>
                    <Select
                      value={config.riskAssessment.riskTolerance}
                      onValueChange={(riskTolerance) =>
                        updateConfig({
                          riskAssessment: {
                            ...config.riskAssessment,
                            riskTolerance: riskTolerance as any
                          }
                        })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Bảo thủ</SelectItem>
                        <SelectItem value="moderate">Vừa phải</SelectItem>
                        <SelectItem value="aggressive">Tích cực</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Trọng số các yếu tố rủi ro</h4>
                    
                    <div>
                      <Label>Biến động (%): {Math.round(config.riskAssessment.volatilityWeight * 100)}</Label>
                      <Slider
                        value={[config.riskAssessment.volatilityWeight]}
                        onValueChange={([volatilityWeight]) =>
                          updateConfig({
                            riskAssessment: { ...config.riskAssessment, volatilityWeight }
                          })
                        }
                        min={0}
                        max={1}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Thanh khoản (%): {Math.round(config.riskAssessment.liquidityWeight * 100)}</Label>
                      <Slider
                        value={[config.riskAssessment.liquidityWeight]}
                        onValueChange={([liquidityWeight]) =>
                          updateConfig({
                            riskAssessment: { ...config.riskAssessment, liquidityWeight }
                          })
                        }
                        min={0}
                        max={1}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Vốn hóa thị trường (%): {Math.round(config.riskAssessment.marketCapWeight * 100)}</Label>
                      <Slider
                        value={[config.riskAssessment.marketCapWeight]}
                        onValueChange={([marketCapWeight]) =>
                          updateConfig({
                            riskAssessment: { ...config.riskAssessment, marketCapWeight }
                          })
                        }
                        min={0}
                        max={1}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="recommendation" className="space-y-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <h3 className="text-lg font-medium">Cấu hình khuyến nghị</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Ngưỡng tin cậy (%): {Math.round(config.recommendation.confidenceThreshold * 100)}</Label>
                  <Slider
                    value={[config.recommendation.confidenceThreshold]}
                    onValueChange={([confidenceThreshold]) =>
                      updateConfig({
                        recommendation: { ...config.recommendation, confidenceThreshold }
                      })
                    }
                    min={0.5}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Mức độ tin cậy tối thiểu để đưa ra khuyến nghị
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bao gồm giá mục tiêu</Label>
                    <p className="text-sm text-muted-foreground">
                      Tính toán và hiển thị giá mục tiêu
                    </p>
                  </div>
                  <Switch
                    checked={config.recommendation.includeTargetPrice}
                    onCheckedChange={(includeTargetPrice) =>
                      updateConfig({
                        recommendation: { ...config.recommendation, includeTargetPrice }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bao gồm stop loss</Label>
                    <p className="text-sm text-muted-foreground">
                      Tính toán và hiển thị mức cắt lỗ
                    </p>
                  </div>
                  <Switch
                    checked={config.recommendation.includeStopLoss}
                    onCheckedChange={(includeStopLoss) =>
                      updateConfig({
                        recommendation: { ...config.recommendation, includeStopLoss }
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Khung thời gian đầu tư</Label>
                  <Select
                    value={config.recommendation.timeHorizon}
                    onValueChange={(timeHorizon) =>
                      updateConfig({
                        recommendation: {
                          ...config.recommendation,
                          timeHorizon: timeHorizon as any
                        }
                      })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Ngắn hạn (1-3 tháng)</SelectItem>
                      <SelectItem value="medium">Trung hạn (3-12 tháng)</SelectItem>
                      <SelectItem value="long">Dài hạn (1+ năm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
