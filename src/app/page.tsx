
'use client';

import type { AnalyzeStockOutput } from '@/ai/flows/analyze-stock-data';
import type { ResearchCompanyInformationOutput } from '@/ai/flows/research-company-information';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, CheckCircle2, DollarSign, Info, LineChart, Loader2, Search, TrendingUp, XCircle } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { getStockAnalysis, getCompanyInfo } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts"


const stockSearchSchema = z.object({
  stockCode: z.string().min(2, 'Mã cổ phiếu phải có ít nhất 2 ký tự').max(10, 'Mã cổ phiếu tối đa 10 ký tự').regex(/^[a-zA-Z0-9]+$/, 'Mã cổ phiếu phải là chữ và số').toUpperCase(),
});

type StockSearchFormValues = z.infer<typeof stockSearchSchema>;

// Placeholder chart data
const priceChartData = [
  { date: "Thg 1", price: 100 },
  { date: "Thg 2", price: 110 },
  { date: "Thg 3", price: 105 },
  { date: "Thg 4", price: 120 },
  { date: "Thg 5", price: 115 },
  { date: "Thg 6", price: 130 },
];

const revenueProfitChartData = [
  { year: "2020", revenue: 1000, profit: 200 },
  { year: "2021", revenue: 1200, profit: 250 },
  { year: "2022", revenue: 1500, profit: 300 },
  { year: "2023", revenue: 1300, profit: 280 },
];

const financialRatiosChartData = [
  { name: "P/E", value: 15.5 },
  { name: "P/B", value: 2.1 },
  { name: "EPS", value: 5.50 },
  { name: "ROE", value: 18.2 },
];

const chartConfig = {
  price: { label: "Giá", color: "hsl(var(--primary))" },
  revenue: { label: "Doanh thu", color: "hsl(var(--chart-1))" },
  profit: { label: "Lợi nhuận", color: "hsl(var(--chart-2))" },
  value: { label: "Giá trị", color: "hsl(var(--accent))" },
} satisfies ChartConfig;


export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeStockOutput | null>(null);
  const [companyInfo, setCompanyInfo] = useState<ResearchCompanyInformationOutput | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<StockSearchFormValues>({
    resolver: zodResolver(stockSearchSchema),
  });

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const onSubmit: SubmitHandler<StockSearchFormValues> = async (data) => {
    setIsLoading(true);
    setAnalysisResult(null);
    setCompanyInfo(null);

    try {
      const [analysis, info] = await Promise.all([
        getStockAnalysis({ stockCode: data.stockCode }),
        getCompanyInfo({ stockCode: data.stockCode }),
      ]);
      setAnalysisResult(analysis);
      setCompanyInfo(info);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu cổ phiếu:", error);
      toast({
        variant: "destructive",
        title: "Phân Tích Thất Bại",
        description: (error as Error).message || "Không thể lấy phân tích cho cổ phiếu. Vui lòng thử lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <LineChart className="h-8 w-8 text-primary" />
          <h1 className="ml-3 text-2xl font-bold text-primary font-headline">Phân Tích Cổ Phiếu Việt Nam</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <section aria-labelledby="stock-search-heading" className="mb-12">
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle id="stock-search-heading" className="text-2xl font-headline text-center">Phân Tích Cổ Phiếu Việt Nam</CardTitle>
              <CardDescription className="text-center">
                Nhập mã cổ phiếu Việt Nam (ví dụ: FPT, VCB) để nhận thông tin chi tiết từ AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="stockCode" className="text-base">Mã Cổ Phiếu</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stockCode"
                      placeholder="ví dụ: FPT"
                      aria-invalid={errors.stockCode ? "true" : "false"}
                      aria-describedby="stockCode-error"
                      className="text-base"
                      {...register("stockCode")}
                    />
                    <Button type="submit" disabled={isLoading} className="text-base px-6">
                      {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-5 w-5" />
                      )}
                      Phân Tích
                    </Button>
                  </div>
                  {errors.stockCode && (
                    <p id="stockCode-error" className="text-sm text-destructive" role="alert">
                      {errors.stockCode.message}
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {isLoading && (
          <div className="flex justify-center items-center my-12" aria-live="polite">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-xl text-foreground">Đang phân tích cổ phiếu, vui lòng đợi...</p>
          </div>
        )}

        {!isLoading && (analysisResult || companyInfo) && (
          <div className="space-y-8">
            <section aria-labelledby="analysis-results-heading">
              <div className="grid md:grid-cols-2 gap-6">
                {analysisResult && (
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle id="analysis-results-heading" className="flex items-center text-xl font-headline">
                        <BarChart3 className="mr-2 h-6 w-6 text-primary" />
                        Phân Tích & Khuyến Nghị AI
                      </CardTitle>
                      <CardDescription>
                        Cho mã cổ phiếu: <span className="font-semibold text-primary">{stockSearchSchema.parse({stockCode: analysisResult.stockCode || ''}).stockCode}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
                        {analysisResult.recommendation === 'mua' ? (
                          <CheckCircle2 className="h-10 w-10 text-green-600" />
                        ) : (
                          <XCircle className="h-10 w-10 text-red-600" />
                        )}
                        <div>
                          <p className="text-lg font-semibold">
                            Khuyến Nghị: <span className={`capitalize ${analysisResult.recommendation === 'mua' ? 'text-green-700' : 'text-red-700'}`}>{analysisResult.recommendation}</span>
                          </p>
                          {analysisResult.recommendation === 'mua' && analysisResult.suggestedPrice && (
                            <p className="text-sm text-muted-foreground">
                              Giá Đề Xuất: <span className="font-medium text-foreground">{analysisResult.suggestedPrice.toLocaleString()} VND</span>
                            </p>
                          )}
                        </div>
                      </div>
                       <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-foreground">Mức Độ Tin Cậy</p>
                        <div className="w-full bg-border rounded-full h-2.5 my-1">
                          <div
                            className="bg-accent h-2.5 rounded-full"
                            style={{ width: `${analysisResult.confidenceLevel * 100}%` }}
                            aria-valuenow={analysisResult.confidenceLevel * 100}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            role="progressbar"
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">{(analysisResult.confidenceLevel * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1 text-foreground">Phân Tích Chi Tiết:</h4>
                        <ScrollArea className="h-40 w-full rounded-md border p-3 text-sm">
                          {analysisResult.analysis || "Không có phân tích chi tiết."}
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {companyInfo && (
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl font-headline">
                        <Info className="mr-2 h-6 w-6 text-primary" />
                        Thông Tin Công Ty
                      </CardTitle>
                       <CardDescription>
                        Tóm tắt cho: <span className="font-semibold text-primary">{stockSearchSchema.parse({stockCode: companyInfo.stockCode || ''}).stockCode}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-semibold mb-1 text-foreground">Tóm Tắt Công Ty:</h4>
                      <ScrollArea className="h-[calc(8rem+100px)] w-full rounded-md border p-3 text-sm"> {/* Adjusted height to match analysis card content area more closely */}
                        {companyInfo.companySummary || "Không có tóm tắt công ty."}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
            
            <section aria-labelledby="financial-charts-heading" className="mt-12">
              <h2 id="financial-charts-heading" className="text-2xl font-bold mb-6 text-center font-headline text-primary">
                Biểu Đồ Tài Chính Minh Họa
              </h2>
              <p className="text-center text-muted-foreground mb-6">Lưu ý: Các biểu đồ này hiển thị dữ liệu giữ chỗ cho mục đích minh họa.</p>
              <div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-accent" />Xu Hướng Giá (Minh Họa)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <RechartsLineChart data={priceChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} tickLine={false} axisLine={false} tickMargin={8} />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2} dot={false} />
                      </RechartsLineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5 text-accent" />Doanh Thu & Lợi Nhuận (Minh Họa)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <BarChart data={revenueProfitChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-lg lg:col-span-2 xl:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-accent" />Chỉ Số Quan Trọng (Minh Họa)</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <BarChart data={financialRatiosChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={60}/>
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t bg-background">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-20 md:flex-row">
          <p className="text-sm leading-loose text-muted-foreground text-center">
            {currentYear !== null ? `© ${currentYear} ` : ''}Phân Tích Cổ Phiếu Việt Nam. Bảo lưu mọi quyền. Dữ liệu tài chính và khuyến nghị chỉ mang tính chất tham khảo.
          </p>
        </div>
      </footer>
    </div>
  );
}

    