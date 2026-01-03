# AeroLogix AI - Product Requirements Document

## Original Problem Statement
Build a mobile application for aircraft maintenance tracking with OCR capability for scanning maintenance documents. The app communicates with an external FastAPI backend hosted on Render.

## User Persona
- Private aircraft owners and operators
- Language: French (primary)

## Core Requirements
1. Aircraft management (CRUD operations)
2. Maintenance tracking with visual progress indicators
3. OCR document scanning for maintenance reports, invoices, etc.
4. ELT (Emergency Locator Transmitter) tracking
5. Parts inventory management
6. Aircraft photo upload and display

## Tech Stack
- **Frontend**: React Native, Expo SDK 52, Expo Router
- **Backend**: External FastAPI API on Render (https://aerologix-backend.onrender.com)
- **State Management**: Zustand (auth), React Context (features)
- **Image Handling**: expo-image-picker with base64

## Key API Endpoints
- `POST /api/auth/login` - Authentication (form-urlencoded: username, password)
- `GET /api/aircraft` - List aircraft
- `POST /api/ocr/scan` - OCR document analysis
- `GET /api/ocr/history/:aircraft_id` - OCR scan history
- `POST /api/ocr/apply/:scan_id` - Apply OCR results
- `DELETE /api/ocr/:scan_id` - Delete OCR scan

## Current Status (January 2025)

### ✅ Completed Features
- Application restored from backup
- Aircraft persistence with backend sync
- OCR system implementation (frontend)
- Aircraft photo upload and watermark display
- Editable maintenance report settings
- ELT tracking screen

### ✅ Bug Fixes (Session 1-3)
1. **Crash on Report screen** - Fixed missing `ELT_FIXED_LIMITS` import
2. **Parts modal keyboard issue** - Added `KeyboardAvoidingView`
3. **Aircraft ID mapping** - Support both `id` and `_id` formats
4. **All Context Providers crash-safe** - Hooks return defaults instead of throwing
5. **Date/Hours calculations** - Added validation for invalid values

### ✅ Feature Improvements (Session 4 - January 2, 2025)
1. **Photo persistence** - `photoUri` now properly mapped to/from `photo_url` API field
2. **OCR Detail Modal** - Can now view full scan results with all extracted data
3. **OCR Apply Sync** - After applying OCR, local stores are updated:
   - Aircraft hours (airframe, engine, propeller)
   - Parts added to maintenance store
   - AD/SBs added to maintenance store
   - Invoices added to invoice store
4. **OCR Delete** - Can now delete scans from history

## File Structure
```
/app/
├── app/                  
│   ├── (tabs)/          
│   │   ├── aircraft/    
│   │   │   ├── ocr-history.tsx    # NEW: Detail modal + apply/delete
│   │   │   ├── ocr-scan.tsx       # UPDATED: Local store sync after apply
│   │   │   └── maintenance/
│   │   │       ├── report.tsx      
│   │   │       ├── parts.tsx       
│   │   │       └── report-settings.tsx
│   ├── _layout.tsx      
│   └── login.tsx
├── services/            
│   └── ocrService.ts    # Has deleteScan(), applyResults()
└── stores/              
    ├── aircraftLocalStore.ts  # UPDATED: photo_url mapping
    ├── maintenanceDataStore.ts # Used for parts/invoices sync
    └── ...
```

## Known Issues
1. **OCR Backend Validation** - Backend may reject scans with null part_number/quantity (needs backend fix to accept Optional fields)
2. **OCR Quota Limit** - User limited to 3 scans/month (needs backend DB update to increase)

## Test Credentials
- Email: lima@123.com
- Password: lima123

## Backlog / Future Tasks
- Backend: Make OCR extracted fields optional (handle null values)
- Backend: Increase OCR quota for testing
- Add offline mode
- Add push notifications for maintenance reminders
