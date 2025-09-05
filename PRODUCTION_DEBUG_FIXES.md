# Production Debug Fixes - Vercel Deployment Issues

## Summary
Critical production errors identified and analyzed on Vercel deployment:
1. **Authentication Error**: GET /api/auth/user returns 401 Unauthorized
2. **Bulk Delete Error**: DELETE /api/orders/bulk-delete returns 500 Internal Server Error

## Root Cause Analysis

### Issue 1: Authentication 401 Error

**Primary Causes:**
1. **JWT Cookie Configuration**: Incorrect cookie settings for Vercel cross-origin requests
2. **Token Extraction Logic**: JWT extraction failing in serverless environment
3. **Database Fallback Issues**: Fallback authentication not triggering correctly
4. **CORS Headers**: Improper CORS configuration for Vercel deployments

**Evidence from Code:**
- Cookie `sameSite: 'lax'` prevents cross-origin cookie sending in production
- Token extraction checks Authorization header first, then cookies
- Database URL validation logic inconsistent between environments
- CORS allows credentials but cookie domain handling is incorrect

### Issue 2: Bulk Delete 500 Error

**Primary Causes:**
1. **Missing Transaction Wrapper**: Individual deletions not wrapped in database transaction
2. **Incomplete Foreign Key Handling**: Some cascade relationships may be missing
3. **Connection Pool Exhaustion**: Serverless environment connection issues
4. **Error Recovery**: No rollback mechanism if deletion fails midway

**Evidence from Code:**
- `bulkDeleteOrders` uses individual queries without transaction
- Deletes related records in sequence but no atomic operation
- No connection pool configuration for Vercel serverless
- Error handling logs details but doesn't recover from partial failures

## Specific Fixes Required

### Fix 1: JWT Cookie Configuration for Vercel

**File**: `/server/local-auth.ts` - Login function around line 190

**Current Code:**
```typescript
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
});
```

**Fixed Code:**
```typescript
// PRODUCTION FIX: Set JWT token with proper Vercel-compatible cookie settings
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax', // 'none' required for Vercel cross-origin
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
  domain: undefined // Let Vercel handle domain automatically
});
```

### Fix 2: Enhanced Token Extraction

**File**: `/server/jwt-utils.ts` - extractToken function

**Current Code:**
```typescript
export function extractToken(authHeader?: string, cookies?: any): string | null {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (cookies && cookies.auth_token) {
    return cookies.auth_token;
  }
  return null;
}
```

**Fixed Code:**
```typescript
export function extractToken(authHeader?: string, cookies?: any): string | null {
  console.log('🔍 Extracting JWT token:', {
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 10),
    hasCookies: !!cookies,
    cookieKeys: cookies ? Object.keys(cookies) : [],
    hasAuthTokenCookie: !!(cookies && cookies.auth_token)
  });
  
  // Try Authorization header first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('✅ Token extracted from Authorization header');
    return token;
  }
  
  // Try cookie as fallback
  if (cookies && cookies.auth_token) {
    console.log('✅ Token extracted from cookie');
    return cookies.auth_token;
  }
  
  console.log('❌ No token found in header or cookies');
  return null;
}
```

### Fix 3: Database Fallback Improvement

**File**: `/server/local-auth.ts` - getCurrentUser function around line 300

**Add this logic before database user lookup:**
```typescript
// PRODUCTION FIX: Better fallback detection for Vercel
const shouldUseFallbackAuth = !process.env.DATABASE_URL || 
  process.env.DATABASE_URL.includes('not-configured') ||
  (process.env.VERCEL === '1' && (!process.env.DATABASE_URL || process.env.DATABASE_URL === ''));

console.log('🔍 getCurrentUser - Database availability:', {
  DATABASE_URL_SET: !!process.env.DATABASE_URL,
  VERCEL: process.env.VERCEL,
  shouldUseFallbackAuth,
  dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'none'
});
```

### Fix 4: Bulk Delete Transaction Wrapper

**File**: `/server/storage.ts` - bulkDeleteOrders method around line 800

**Wrap the entire operation in a transaction:**
```typescript
async bulkDeleteOrders(orderIds: number[], deletedBy: string): Promise<PurchaseOrder[]> {
  if (!orderIds || orderIds.length === 0) {
    return [];
  }
  
  console.log(`🗑️ Starting bulk delete for ${orderIds.length} orders by ${deletedBy}:`, orderIds);
  
  // PRODUCTION FIX: Use database transaction for atomic operations
  const deletedOrders = await db.transaction(async (trx) => {
    try {
      // Get orders that exist before deleting
      const existingOrders: PurchaseOrder[] = [];
      for (const orderId of orderIds) {
        const [order] = await trx
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, orderId));
        if (order) {
          existingOrders.push(order);
        }
      }
      
      if (existingOrders.length === 0) {
        console.log('⚠️ No orders found to delete');
        return [];
      }
      
      const existingOrderIds = existingOrders.map(o => o.id);
      console.log(`🔍 Found ${existingOrders.length} orders to delete:`, existingOrderIds);
      
      // Delete related records for each order individually (in proper order to avoid FK constraints)
      for (const orderId of existingOrderIds) {
        console.log(`🗑️ Deleting related records for order ${orderId}...`);
        
        // 1. Delete approval step instances
        await trx.delete(approvalStepInstances).where(eq(approvalStepInstances.orderId, orderId));
        
        // 2. Delete purchase order items
        await trx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId));
        
        // 3. Delete attachments
        await trx.delete(attachments).where(eq(attachments.orderId, orderId));
        
        // 4. Delete order history
        await trx.delete(orderHistory).where(eq(orderHistory.orderId, orderId));
        
        // 5. Delete the order itself
        await trx.delete(purchaseOrders).where(eq(purchaseOrders.id, orderId));
        
        console.log(`✅ Deleted order ${orderId} and all related records`);
      }
      
      console.log(`✅ Bulk deleted ${existingOrders.length} orders successfully`);
      return existingOrders;
      
    } catch (error) {
      console.error('❌ Transaction error - rolling back:', error);
      throw error; // This will trigger transaction rollback
    }
  });
  
  return deletedOrders;
}
```

### Fix 5: CORS Configuration Enhancement

**File**: `/api/[...all].js` - handler function

**Update CORS configuration:**
```javascript
// PRODUCTION FIX: Enhanced CORS for all Vercel deployment URLs
const origin = req.headers.origin;
const allowedOrigins = [
  'https://ikjin-po-mgmt-20250813-dno9.vercel.app',
  'https://ikjin-po-mgmt-20250813-dn.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000'
];

console.log('🌐 Request origin:', origin);
console.log('📋 Allowed origins:', allowedOrigins);

// Enhanced origin validation for Vercel deployments
const isAllowedOrigin = !origin || 
  allowedOrigins.includes(origin) ||
  // Allow all Vercel deployments for this project (including preview deployments)
  (origin.includes('ikjin-po-mgmt-20250813') && 
   origin.includes('.vercel.app') && 
   origin.includes('davidswyang-3963s-projects')) ||
  // Allow production domain
  origin.includes('ikjin-po-mgmt-20250813-dno9.vercel.app');

if (isAllowedOrigin) {
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://ikjin-po-mgmt-20250813-dno9.vercel.app');
  console.log('✅ CORS origin set to:', origin);
} else {
  console.log('❌ Origin not allowed:', origin);
}

res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Access-Control-Max-Age', '86400');
```

## Environment Variables to Check

Verify these environment variables are properly set in Vercel:

```bash
# Required for database connection
DATABASE_URL=postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# Required for JWT token generation
JWT_SECRET=ikjin-po-mgmt-jwt-secret-2025-secure-key

# Required for session management
SESSION_SECRET=ikjin-po-mgmt-secure-session-key-2025

# Environment indicators
VERCEL=1
NODE_ENV=production
VITE_ENVIRONMENT=production
```

## Testing Strategy

### Authentication Testing:
1. **Login Flow**: Test POST /api/auth/login with correct credentials
2. **Cookie Verification**: Check if auth_token cookie is set correctly
3. **User Retrieval**: Test GET /api/auth/user with cookie
4. **Cross-Origin**: Test from different Vercel deployment URLs

### Bulk Delete Testing:
1. **Single Order**: Test deleting one order
2. **Multiple Orders**: Test bulk delete with 3-5 orders
3. **Error Handling**: Test with non-existent order IDs
4. **Permission Check**: Test with non-admin users

### Commands for Testing:
```bash
# Test authentication
curl -X POST https://ikjin-po-mgmt-20250813-dno9.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "admin123"}' \
  -c cookies.txt

# Test user retrieval
curl -X GET https://ikjin-po-mgmt-20250813-dno9.vercel.app/api/auth/user \
  -b cookies.txt

# Test bulk delete (admin required)
curl -X DELETE https://ikjin-po-mgmt-20250813-dno9.vercel.app/api/orders/bulk-delete \
  -H "Content-Type: application/json" \
  -d '{"orderIds": [1, 2, 3]}' \
  -b cookies.txt
```

## Priority Implementation Order

1. **HIGH PRIORITY**: Fix JWT cookie configuration (Fix 1)
2. **HIGH PRIORITY**: Fix token extraction logging (Fix 2)
3. **MEDIUM PRIORITY**: Add transaction wrapper to bulk delete (Fix 4)
4. **MEDIUM PRIORITY**: Enhance CORS configuration (Fix 5)
5. **LOW PRIORITY**: Improve database fallback detection (Fix 3)

## Monitoring and Rollback Plan

- **Monitor**: Watch Vercel function logs after deployment
- **Rollback**: Keep current deployment active until fixes are verified
- **Testing**: Use preview deployments for testing fixes
- **Gradual**: Deploy fixes one at a time to isolate issues

## Additional Notes

- The bulk delete issue may also be related to database connection pooling in serverless
- Authentication errors might be intermittent due to cookie domain issues
- Consider implementing a health check endpoint for production monitoring
- Database connection should use pooler URL for Vercel serverless functions