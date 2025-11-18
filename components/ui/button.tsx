import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { cn } from '@/utils/cn';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
}: ButtonProps) {
  const baseStyles = 'rounded-lg items-center justify-center';
  
  const variantStyles = {
    primary: 'bg-blue-500 active:bg-blue-600',
    secondary: 'bg-gray-200 dark:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600',
    outline: 'border-2 border-blue-500 bg-transparent active:bg-blue-50 dark:active:bg-blue-900',
    ghost: 'bg-transparent active:bg-gray-100 dark:active:bg-gray-800',
  };

  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const textVariantStyles = {
    primary: 'text-white',
    secondary: 'text-gray-900 dark:text-gray-100',
    outline: 'text-blue-500',
    ghost: 'text-gray-900 dark:text-gray-100',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && 'opacity-50',
        className
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? 'white' : undefined} />
      ) : (
        <Text className={cn('font-semibold', textVariantStyles[variant], textSizeStyles[size])}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

