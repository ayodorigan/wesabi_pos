interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const shouldRetry = isRetryableError(error);

        if (shouldRetry) {
          if (onRetry) {
            onRetry(attempt, error);
          }

          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));

          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}

function isRetryableError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const errorMessage = 'message' in error ? String((error as { message: unknown }).message).toLowerCase() : '';
    const errorCode = 'code' in error ? String((error as { code: unknown }).code) : '';

    const retryableErrors = [
      'network error',
      'failed to fetch',
      'timeout',
      'econnrefused',
      'econnreset',
      'etimedout',
      'connection refused',
      'connection reset',
      'socket hang up',
      'aborted',
      '503',
      '504',
      '408',
      'pgrst301',
    ];

    return retryableErrors.some(pattern =>
      errorMessage.includes(pattern) || errorCode.toLowerCase().includes(pattern)
    );
  }

  return false;
}

export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    retryDelay: 1000,
    onRetry: (attempt, error) => {
      console.warn(`${operationName} failed (attempt ${attempt}/3). Retrying...`, error);
    }
  });
}
