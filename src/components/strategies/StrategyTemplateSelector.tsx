import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategyParameter, StrategyParameterEditor } from './StrategyParameterEditor';
import { TrendingUp, TrendingDown, Activity, BarChart3, Zap, Shield, Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Strategy template types
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trend' | 'mean_reversion' | 'momentum' | 'volatility' | 'arbitrage';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  parameters: StrategyParameter[];
  icon: React.ReactNode;
  tags: string[];
  expectedReturn?: string;
  riskLevel: 'low' | 'medium' | 'high';
  timeframes: string[];
  instruments: string[];
}

interface StrategyTemplateSelectorProps {
  onSelect: (template: StrategyTemplate) => void;
  selectedTemplate?: StrategyTemplate | null;
  className?: string;
}

// Strategy templates
const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'moving_average_crossover',
    name: 'Moving Average Crossover',
    description: 'Classic trend-following strategy using two moving averages. Buy when short MA crosses above long MA, sell when it crosses below.',
    category: 'trend',
    difficulty: 'beginner',
    riskLevel: 'medium',
    icon: <TrendingUp className="h-5 w-5" />,
    tags: ['trend', 'beginner', 'classic'],
    expectedReturn: '8-15% annually',
    timeframes: ['1h', '4h', '1d'],
    instruments: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
    parameters: [
      {
        id: 'fast_ma_period',
        name: 'Fast MA Period',
        type: 'number',
        value: 10,
        description: 'Period for the fast moving average',
        min: 5,
        max: 50,
        step: 1,
        defaultValue: 10,
      },
      {
        id: 'slow_ma_period',
        name: 'Slow MA Period',
        type: 'number',
        value: 20,
        description: 'Period for the slow moving average',
        min: 10,
        max: 200,
        step: 1,
        defaultValue: 20,
      },
      {
        id: 'ma_type',
        name: 'MA Type',
        type: 'select',
        value: 'SMA',
        description: 'Type of moving average',
        options: ['SMA', 'EMA', 'WMA'],
        defaultValue: 'SMA',
      },
    ],
  },
  {
    id: 'rsi_momentum',
    name: 'RSI Momentum',
    description: 'Momentum strategy using RSI indicator. Buy when RSI is oversold, sell when overbought. Works best in ranging markets.',
    category: 'momentum',
    difficulty: 'beginner',
    riskLevel: 'medium',
    icon: <Activity className="h-5 w-5" />,
    tags: ['momentum', 'oscillator', 'range'],
    expectedReturn: '10-20% annually',
    timeframes: ['30m', '1h', '4h'],
    instruments: ['BTC-USD', 'ETH-USD', 'ADA-USD'],
    parameters: [
      {
        id: 'rsi_period',
        name: 'RSI Period',
        type: 'number',
        value: 14,
        description: 'Number of periods for RSI calculation',
        min: 2,
        max: 50,
        step: 1,
        defaultValue: 14,
      },
      {
        id: 'oversold_level',
        name: 'Oversold Level',
        type: 'number',
        value: 30,
        description: 'RSI level considered oversold (buy signal)',
        min: 10,
        max: 40,
        step: 1,
        defaultValue: 30,
      },
      {
        id: 'overbought_level',
        name: 'Overbought Level',
        type: 'number',
        value: 70,
        description: 'RSI level considered overbought (sell signal)',
        min: 60,
        max: 90,
        step: 1,
        defaultValue: 70,
      },
    ],
  },
  {
    id: 'bollinger_bands_breakout',
    name: 'Bollinger Bands Breakout',
    description: 'Volatility strategy that trades breakouts from Bollinger Bands. Buy on upper band breakout, sell on lower band breakdown.',
    category: 'volatility',
    difficulty: 'intermediate',
    riskLevel: 'high',
    icon: <BarChart3 className="h-5 w-5" />,
    tags: ['volatility', 'breakout', 'bands'],
    expectedReturn: '15-25% annually',
    timeframes: ['15m', '30m', '1h'],
    instruments: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
    parameters: [
      {
        id: 'bb_period',
        name: 'BB Period',
        type: 'number',
        value: 20,
        description: 'Period for Bollinger Bands',
        min: 10,
        max: 50,
        step: 1,
        defaultValue: 20,
      },
      {
        id: 'bb_std_dev',
        name: 'Standard Deviations',
        type: 'number',
        value: 2,
        description: 'Number of standard deviations for bands',
        min: 1.5,
        max: 3,
        step: 0.1,
        defaultValue: 2,
      },
      {
        id: 'breakout_confirmation',
        name: 'Require Confirmation',
        type: 'boolean',
        value: true,
        description: 'Require price to close outside bands for confirmation',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'macd_strategy',
    name: 'MACD Strategy',
    description: 'Momentum strategy using MACD indicator. Buy when MACD crosses above signal line, sell when it crosses below.',
    category: 'momentum',
    difficulty: 'intermediate',
    riskLevel: 'medium',
    icon: <Zap className="h-5 w-5" />,
    tags: ['momentum', 'macd', 'crossover'],
    expectedReturn: '12-18% annually',
    timeframes: ['1h', '4h', '1d'],
    instruments: ['BTC-USD', 'ETH-USD', 'LINK-USD'],
    parameters: [
      {
        id: 'macd_fast',
        name: 'MACD Fast EMA',
        type: 'number',
        value: 12,
        description: 'Fast EMA period for MACD',
        min: 5,
        max: 20,
        step: 1,
        defaultValue: 12,
      },
      {
        id: 'macd_slow',
        name: 'MACD Slow EMA',
        type: 'number',
        value: 26,
        description: 'Slow EMA period for MACD',
        min: 15,
        max: 40,
        step: 1,
        defaultValue: 26,
      },
      {
        id: 'macd_signal',
        name: 'Signal Line Period',
        type: 'number',
        value: 9,
        description: 'Signal line EMA period',
        min: 5,
        max: 15,
        step: 1,
        defaultValue: 9,
      },
    ],
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    description: 'Statistical arbitrage strategy that bets on price returning to mean. Buy when price is far below mean, sell when above.',
    category: 'mean_reversion',
    difficulty: 'advanced',
    riskLevel: 'high',
    icon: <Target className="h-5 w-5" />,
    tags: ['mean_reversion', 'statistical', 'arbitrage'],
    expectedReturn: '20-30% annually',
    timeframes: ['5m', '15m', '30m'],
    instruments: ['BTC-USD', 'ETH-USD'],
    parameters: [
      {
        id: 'lookback_period',
        name: 'Lookback Period',
        type: 'number',
        value: 50,
        description: 'Period for mean calculation',
        min: 20,
        max: 200,
        step: 5,
        defaultValue: 50,
      },
      {
        id: 'std_dev_threshold',
        name: 'Std Dev Threshold',
        type: 'number',
        value: 2,
        description: 'Standard deviations from mean for entry',
        min: 1,
        max: 3,
        step: 0.1,
        defaultValue: 2,
      },
      {
        id: 'exit_threshold',
        name: 'Exit Threshold',
        type: 'number',
        value: 0.5,
        description: 'Standard deviations from mean for exit',
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
      },
    ],
  },
  {
    id: 'grid_trading',
    name: 'Grid Trading',
    description: 'Place buy and sell orders at regular intervals above and below current price. Profits from market volatility.',
    category: 'volatility',
    difficulty: 'advanced',
    riskLevel: 'high',
    icon: <Shield className="h-5 w-5" />,
    tags: ['grid', 'volatility', 'systematic'],
    expectedReturn: '15-35% annually',
    timeframes: ['1m', '5m', '15m'],
    instruments: ['BTC-USD', 'ETH-USD'],
    parameters: [
      {
        id: 'grid_size',
        name: 'Grid Size (%)',
        type: 'number',
        value: 1,
        description: 'Percentage distance between grid levels',
        min: 0.5,
        max: 5,
        step: 0.1,
        defaultValue: 1,
      },
      {
        id: 'grid_levels',
        name: 'Grid Levels',
        type: 'number',
        value: 10,
        description: 'Number of grid levels above and below price',
        min: 5,
        max: 20,
        step: 1,
        defaultValue: 10,
      },
      {
        id: 'take_profit',
        name: 'Take Profit (%)',
        type: 'number',
        value: 2,
        description: 'Take profit percentage for each grid level',
        min: 0.5,
        max: 5,
        step: 0.1,
        defaultValue: 2,
      },
    ],
  },
];

// Category configuration
const CATEGORIES = {
  trend: {
    name: 'Trend Following',
    description: 'Strategies that follow market trends',
    color: 'bg-green-500',
  },
  momentum: {
    name: 'Momentum',
    description: 'Strategies based on price momentum',
    color: 'bg-blue-500',
  },
  mean_reversion: {
    name: 'Mean Reversion',
    description: 'Strategies that bet on price returning to mean',
    color: 'bg-purple-500',
  },
  volatility: {
    name: 'Volatility',
    description: 'Strategies that profit from volatility',
    color: 'bg-orange-500',
  },
  arbitrage: {
    name: 'Arbitrage',
    description: 'Statistical arbitrage strategies',
    color: 'bg-cyan-500',
  },
};

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const RISK_COLORS = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

export function StrategyTemplateSelector({
  onSelect,
  selectedTemplate,
  className,
}: StrategyTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<StrategyTemplate | null>(null);

  const filteredTemplates = selectedCategory === 'all'
    ? STRATEGY_TEMPLATES
    : STRATEGY_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: StrategyTemplate) => {
    onSelect(template);
    setPreviewTemplate(template);
  };

  const renderTemplateCard = (template: StrategyTemplate) => {
    const isSelected = selectedTemplate?.id === template.id;
    const category = CATEGORIES[template.category];

    return (
      <Card
        key={template.id}
        className={cn(
          'cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg',
          isSelected && 'border-primary bg-primary/5',
          'glass-panel'
        )}
        onClick={() => handleSelectTemplate(template)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', category.color, 'text-white')}>
                {template.icon}
              </div>
              <div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {category.name}
                  </Badge>
                  <Badge className={cn('text-xs', DIFFICULTY_COLORS[template.difficulty])}>
                    {template.difficulty}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className={cn('text-sm font-medium', RISK_COLORS[template.riskLevel])}>
                {template.riskLevel.toUpperCase()} RISK
              </div>
              {template.expectedReturn && (
                <div className="text-xs text-muted-foreground">
                  {template.expectedReturn}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Timeframes:</span>
              <span className="font-medium">{template.timeframes.join(', ')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Parameters:</span>
              <span className="font-medium">{template.parameters.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Strategy Templates
            <div className="group relative">
              <Info className="h-4 w-4 text-muted-foreground" />
              <div className="absolute right-0 top-6 w-64 p-3 bg-popover border rounded-md shadow-md text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
                Choose from pre-built strategy templates or customize your own. Each template includes optimized parameters for different market conditions.
              </div>
            </div>
          </CardTitle>
          <CardDescription>
            Select a pre-built strategy template to get started quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="trend">Trend</TabsTrigger>
              <TabsTrigger value="momentum">Momentum</TabsTrigger>
              <TabsTrigger value="mean_reversion">Mean Rev</TabsTrigger>
              <TabsTrigger value="volatility">Volatility</TabsTrigger>
              <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(renderTemplateCard)}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Parameter Preview */}
      {previewTemplate && (
        <StrategyParameterEditor
          parameters={previewTemplate.parameters}
          onChange={(params) => {
            // Update the template with new parameters
            const updatedTemplate = { ...previewTemplate, parameters: params };
            onSelect(updatedTemplate);
          }}
          showAdvanced={false}
        />
      )}
    </div>
  );
}

export default StrategyTemplateSelector;
