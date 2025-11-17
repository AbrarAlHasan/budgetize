export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateAccountName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Account name is required' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Account name must be at least 2 characters' };
  }
  return { isValid: true };
}

export function validateAmount(amount: string): ValidationResult {
  if (!amount || !amount.trim()) {
    return { isValid: false, error: 'Amount is required' };
  }

  const amountValue = parseFloat(amount);
  if (isNaN(amountValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  if (amountValue <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (amountValue > 1000000000) {
    return { isValid: false, error: 'Amount is too large' };
  }

  return { isValid: true };
}

export function validateDate(date: string): ValidationResult {
  if (!date || !date.trim()) {
    return { isValid: false, error: 'Date is required' };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }

  return { isValid: true };
}

export function validateCreditLimit(limit: string): ValidationResult {
  if (!limit || !limit.trim()) {
    return { isValid: true }; // Optional field
  }

  const limitValue = parseFloat(limit);
  if (isNaN(limitValue)) {
    return { isValid: false, error: 'Please enter a valid credit limit' };
  }

  if (limitValue < 0) {
    return { isValid: false, error: 'Credit limit cannot be negative' };
  }

  return { isValid: true };
}

export function validatePaymentMode(mode: string): ValidationResult {
  if (!mode || !mode.trim()) {
    return { isValid: false, error: 'Payment mode is required' };
  }
  if (mode.trim().length < 2) {
    return { isValid: false, error: 'Payment mode must be at least 2 characters' };
  }
  return { isValid: true };
}

export function validateTagName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Tag name is required' };
  }
  if (name.trim().length < 1) {
    return { isValid: false, error: 'Tag name cannot be empty' };
  }
  if (name.trim().length > 50) {
    return { isValid: false, error: 'Tag name must be less than 50 characters' };
  }
  return { isValid: true };
}

