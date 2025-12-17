# Robust Data Fetching Solution

## Problem
Pages sometimes loaded with empty data, requiring a full page refresh to display correctly. This occurred because:
1. Data only fetched on initial mount
2. No refetch mechanism when navigating between pages
3. Components didn't remount when switching tabs
4. Race conditions in async operations
5. No tracking of data freshness

## Solution Overview

A comprehensive data fetching system that ensures data always loads correctly when accessing pages.

## Implementation

### 1. Custom Hook: `useDataFetch`
**Location:** `src/hooks/useDataFetch.ts`

A reusable hook for managing async data fetching with:
- **Loading states** - Tracks when data is being fetched
- **Error handling** - Catches and exposes errors
- **Race condition prevention** - Cancels outdated requests using abort controllers
- **Retry logic** - Automatically retries failed requests (3 attempts by default)
- **Stale data management** - Tracks data freshness
- **Optional caching** - Configurable cache time (default: 5 minutes)
- **Refetch on focus** - Optionally refresh data when page regains focus

**Usage:**
```typescript
const { data, loading, error, refetch, isStale } = useDataFetch(
  fetchFunction,
  [dependencies],
  {
    enabled: true,
    refetchOnMount: true,
    refetchOnFocus: false,
    staleTime: 0,
    cacheTime: 300000,
    retry: 3,
    retryDelay: 1000
  }
);
```

### 2. Page Refresh Hook: `usePageRefresh`
**Location:** `src/hooks/usePageRefresh.ts`

A specialized hook that triggers data refresh when:
- A page is first accessed
- Navigating between different pages
- Data becomes stale (configurable threshold)
- Automatically prevents redundant fetches

**Features:**
- Page-aware refreshing (tracks which page is active)
- Configurable stale time (default: 30 seconds)
- Prevents fetch loops
- Works with AppContext's centralized data

**Usage:**
```typescript
usePageRefresh('pageName', {
  refreshOnMount: true,
  staleTime: 30000 // 30 seconds
});
```

### 3. Enhanced AppContext
**Location:** `src/contexts/AppContext.tsx`

Updated to include:
- **Error state** - Tracks and exposes fetch errors
- **Last refresh time** - Timestamp of last successful data fetch
- **Improved error handling** - Graceful degradation on errors

**New Context Values:**
```typescript
{
  error: Error | null;
  lastRefreshTime: number;
  // ... existing values
}
```

### 4. Updated Components

All data-consuming components now use `usePageRefresh`:

- **Dashboard** - `usePageRefresh('dashboard')`
- **Inventory** - `usePageRefresh('inventory')`
- **POS** - `usePageRefresh('pos')`
- **Analytics** - `usePageRefresh('analytics')`
- **SalesHistory** - `usePageRefresh('drugsaleshistory')`
- **StockTake** - `usePageRefresh('stocktake')`
- **Orders** - `usePageRefresh('orders')` + local refetch logic

## How It Works

### Data Flow

1. **User navigates to a page**
   → Component mounts
   → `usePageRefresh` hook activates

2. **Hook checks data freshness**
   → Compares current time with `lastRefreshTime`
   → Determines if refresh is needed

3. **If data is stale or first access**
   → Calls `refreshData()` from AppContext
   → Sets loading state
   → Fetches all data from Supabase

4. **Data updates trigger re-renders**
   → Components automatically receive fresh data
   → Loading states clear
   → UI updates

5. **On subsequent page visits**
   → If within stale time window: uses cached data
   → If beyond stale time: triggers new fetch

### Race Condition Prevention

The `useDataFetch` hook prevents race conditions through:

```typescript
// Each fetch gets a unique ID
const currentFetchId = ++fetchIdRef.current;

// Only update state if this is still the current fetch
if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
  setData(result);
}
```

### Abort Controller Usage

```typescript
// Cancel previous request if still running
if (abortControllerRef.current) {
  abortControllerRef.current.abort();
}

// Create new controller for this request
abortControllerRef.current = new AbortController();
```

## Configuration Options

### Stale Time
Controls how long data is considered fresh:
- **0ms** - Always fetch (no cache)
- **30000ms** (30s) - Default for most pages
- **60000ms** (1m) - For slowly changing data

### Cache Time
Duration before marking data as stale:
- **300000ms** (5m) - Default
- Can be adjusted per use case

### Retry Logic
Failed requests are retried automatically:
- **3 attempts** - Default retry count
- **1000ms delay** - Between retry attempts
- Exponential backoff can be added if needed

## Benefits

### 1. Reliability
- Data always loads when accessing a page
- Handles network failures gracefully
- Automatic retry on temporary failures

### 2. Performance
- Caching prevents unnecessary fetches
- Configurable stale time balances freshness vs performance
- Parallel requests avoided

### 3. User Experience
- No more empty screens requiring refresh
- Smooth navigation between pages
- Clear loading states

### 4. Developer Experience
- Simple API: just call `usePageRefresh()`
- Centralized data management
- Reusable patterns
- TypeScript support

### 5. Scalability
- Easy to add new pages
- Configurable per-page behavior
- Supports complex data dependencies

## Testing Scenarios

To verify the solution works:

### Test 1: Page Navigation
1. Login to the app
2. Navigate to Dashboard → see data
3. Navigate to Inventory → see data
4. Navigate back to Dashboard → see data
5. **Result:** Data loads on every navigation

### Test 2: Stale Data Refresh
1. Load a page
2. Wait 31+ seconds
3. Navigate away and back
4. **Result:** Data refreshes automatically

### Test 3: Network Failure
1. Disconnect network
2. Navigate to a page
3. **Result:** Error state handled gracefully
4. Reconnect network
5. Navigate again
6. **Result:** Data loads successfully

### Test 4: Race Conditions
1. Navigate quickly between pages
2. **Result:** No stale data displayed, latest fetch wins

## Future Enhancements

### Optional Improvements:
1. **Optimistic Updates** - Update UI before server confirms
2. **Mutation Tracking** - Invalidate specific data after changes
3. **Websocket Integration** - Real-time updates
4. **Pagination Support** - For large datasets
5. **Query Invalidation** - Granular cache control

### Advanced Patterns:
- **React Query Migration** - For even more features
- **GraphQL Integration** - If API changes
- **Offline Support** - Service worker caching

## Troubleshooting

### Issue: Data still not loading
**Check:**
- Network connection
- Supabase credentials in `.env`
- Browser console for errors
- `lastRefreshTime` in AppContext

### Issue: Too many fetches
**Solution:**
- Increase `staleTime` in `usePageRefresh`
- Check for duplicate hook calls

### Issue: Stale data displayed
**Solution:**
- Decrease `staleTime`
- Call `refreshData()` manually after mutations

## Summary

This solution provides a robust, scalable data fetching system that:
- ✅ Always fetches data when accessing pages
- ✅ Handles navigation properly
- ✅ Prevents race conditions
- ✅ Includes loading and error states
- ✅ Supports optional caching
- ✅ Works with functional components and hooks
- ✅ Provides reusable patterns

The implementation is production-ready and can be extended as needed.
