import { Text, View } from 'react-native';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarData[];
  height?: number;
  showValues?: boolean;
  maxValue?: number;
  showYAxis?: boolean;
  yAxisSteps?: number;
  currencySymbol?: string;
}

export function SimpleBarChart({ 
  data, 
  height = 200, 
  showValues = true,
  maxValue,
  showYAxis = false,
  yAxisSteps = 4,
  currencySymbol = '',
}: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  const steps = Array.from({ length: yAxisSteps + 1 }, (_, i) => max - (max / yAxisSteps) * i);
  const formatPrecision = (value: number) => {
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
    return formatted.replace(/\.0$/, '');
  };
  const formatCompactNumber = (value: number) => {
    if (value >= 1e7) return `${formatPrecision(value / 1e7)}Cr`;
    if (value >= 1e5) return `${formatPrecision(value / 1e5)}L`;
    if (value >= 1e3) return `${formatPrecision(value / 1e3)}k`;
    return value.toFixed(0);
  };

  // Generate grid lines (horizontal lines)
  const gridLines = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const percentage = (i / yAxisSteps) * 100;
    return percentage;
  });

  const chartContent = (
    <View className="flex-row items-end justify-between h-full gap-2 flex-1" style={{ position: 'relative' }}>
      {/* Grid lines overlay */}
      <View 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 0,
        }}
      >
        {gridLines.map((percentage, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: `${percentage}%`,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: '#E5E7EB', // gray-200
              opacity: 0.5,
            }}
            className="dark:bg-gray-700"
          />
        ))}
      </View>
      
      {/* Bars */}
      {data.map((item, index) => {
        const barHeight = max > 0 ? (item.value / max) * 100 : 0;
        const color = item.color || colors[index % colors.length];
        const formattedValue = formatCompactNumber(item.value);
        // Reserve at least 15% space at top for value label, adjust bar height accordingly
        const reservedTopSpace = 15;
        const adjustedBarHeight = Math.min(barHeight, 100 - reservedTopSpace);
        const emptySpace = 100 - adjustedBarHeight;
        
        return (
          <View key={index} className="flex-1 items-center" style={{ height: '100%', zIndex: 1 }}>
            <View className="w-full" style={{ height: '100%', position: 'relative' }}>
              {/* Empty space at top with value label */}
              <View style={{ height: `${emptySpace}%`, minHeight: 20 }}>
                {item.value > 0 && (
                  <View className="w-full items-center justify-end" style={{ height: '100%', paddingBottom: 2 }}>
                    <Text className="text-[10px] font-semibold text-gray-900 dark:text-gray-100">
                      {currencySymbol}{formattedValue}
                    </Text>
                  </View>
                )}
              </View>
              {/* Bar */}
              <View
                className="w-full rounded-t-lg"
                style={{
                  height: `${adjustedBarHeight}%`,
                  backgroundColor: color,
                  minHeight: item.value > 0 ? 4 : 0,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View className="w-full">
      <View className="flex-row" style={{ height }}>
        {showYAxis && (
          <View className="justify-between mr-3">
            {steps.map((value, index) => (
              <Text key={index} className="text-[10px] text-gray-500 dark:text-gray-400">
                {value > 0 ? value.toFixed(0) : '0'}
              </Text>
            ))}
          </View>
        )}
        <View className="flex-1">
          {chartContent}
        </View>
      </View>
      {showValues && (
        <View className="mt-3">
          <View className="flex-row justify-between">
            {data.map((item, index) => (
              <View key={index} className="flex-1 items-center">
                <Text className="text-xs text-gray-600 dark:text-gray-400 text-center" numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

