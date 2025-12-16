export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return formatErrorMessage(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: string }).message;
    return formatErrorMessage(message);
  }

  return 'An unexpected error occurred. Please try again.';
};

const formatErrorMessage = (message: string): string => {
  const errorMappings: Record<string, string> = {
    'duplicate key value violates unique constraint': 'This record already exists.',
    'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
    'NetworkError': 'Network error. Please check your connection and try again.',
    'Failed to create user profile': 'Unable to create user account. The email may already be in use.',
    'User already exists': 'A user with this email already exists.',
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please verify your email address before logging in.',
    'Invalid authorization token': 'Your session has expired. Please log in again.',
    'Insufficient permissions': 'You do not have permission to perform this action.',
    'Missing authorization header': 'Authentication required. Please log in.',
    'User profile not found': 'User profile not found. Please contact support.',
    'Missing required fields': 'Please fill in all required fields.',
    'Failed to process M-Pesa payment': 'Payment processing failed. Please try again or use another payment method.',
    'Transaction already exists': 'This transaction has already been recorded.',
    'Timeout': 'The operation took too long. Please try again.',
    'violates foreign key constraint': 'Cannot complete this action due to related records.',
    'permission denied': 'You do not have permission to access this resource.',
    'jwt expired': 'Your session has expired. Please log in again.',
    'refresh_token_not_found': 'Your session has expired. Please log in again.',
  };

  let formattedMessage = message;

  for (const [key, value] of Object.entries(errorMappings)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      formattedMessage = value;
      break;
    }
  }

  if (formattedMessage === message && message.length > 100) {
    formattedMessage = 'An error occurred. Please try again or contact support.';
  }

  return formattedMessage;
};
