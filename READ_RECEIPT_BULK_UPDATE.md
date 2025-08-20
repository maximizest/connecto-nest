# Read Receipt Bulk Operations Update

## Overview
Updated ReadReceiptController to leverage `@foryourdev/nestjs-crud`'s native bulk creation support instead of custom implementation.

## Changes Made

### Before
- Custom handling using `messageIds` field
- Manual bulk processing in BeforeCreate hook
- Non-standard API pattern

### After
- Native bulk support using array submission
- Standard nestjs-crud pattern
- Cleaner implementation

## API Usage

### Single Creation
```bash
POST /api/v1/read-receipts
Content-Type: application/json

{
  "messageId": 1,
  "deviceType": "mobile"
}
```

### Bulk Creation (Native Support)
```bash
POST /api/v1/read-receipts
Content-Type: application/json

[
  { "messageId": 1, "deviceType": "mobile" },
  { "messageId": 2, "deviceType": "mobile" },
  { "messageId": 3, "deviceType": "mobile" }
]
```

## Implementation Details

### BeforeCreate Hook
- Detects array input (bulk operation)
- Processes each item:
  - Validates message access
  - Checks for existing receipts (upsert logic)
  - Updates existing or prepares new receipts
- Returns only new items for creation

### AfterCreate Hook
- Handles both single and array responses
- Emits WebSocket events for real-time sync
- Supports both create and update scenarios

## Benefits

1. **Standard Pattern**: Uses nestjs-crud's documented bulk pattern
2. **Cleaner Code**: Removed custom `messageIds` handling
3. **Better Separation**: Update vs create logic clearly separated
4. **Event Handling**: Proper events for both new and updated receipts
5. **Maintainability**: Easier to understand and maintain

## Migration Guide

### Frontend Changes
```javascript
// Before
POST /read-receipts
{ messageIds: [1, 2, 3] }

// After (standard bulk pattern)
POST /read-receipts
[
  { messageId: 1 },
  { messageId: 2 },
  { messageId: 3 }
]
```

### WebSocket Events
- Single creation: `isUpdate: false`
- Bulk creation: `isBulkCreate: true`
- Updates during bulk: `isUpdate: true`

## Compatibility

- Backward compatible with single creation
- WebSocket integration unchanged
- Service layer methods remain the same
- Upsert logic preserved