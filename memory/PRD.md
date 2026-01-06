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
- **NEW:** `GET /api/parts/:aircraft_id` - Get parts for aircraft
- **NEW:** `GET /api/adsb/:aircraft_id` - Get AD/SBs for aircraft
- **NEW:** `GET /api/stc/:aircraft_id` - Get STCs for aircraft
- **NEW:** `GET /api/invoices/:aircraft_id` - Get invoices for aircraft

## Current Status (January 2025)

### ✅ Completed Features
- Application restored from backup
- Aircraft persistence with backend sync
- OCR system implementation (frontend)
- Aircraft photo upload and watermark display
- Editable maintenance report settings
- ELT tracking screen

### ✅ Bug Fixes (Sessions 1-3)
1. Crash on Report screen - Fixed
2. Parts modal keyboard issue - Fixed
3. All Context Providers crash-safe
4. Date/Hours calculations validation

### ✅ Feature Improvements (Session 4 - January 2, 2025)
1. **Photo persistence** - `photoUri` properly mapped to/from `photo_url`
2. **OCR Detail Modal** - View full scan results with extracted data
3. **OCR Apply/Delete** - Functional buttons in history screen

### ✅ Backend Sync Integration (Session 5 - January 3, 2025)
1. **New `maintenanceService.ts`** - API calls for parts, AD/SB, STC, invoices
2. **`maintenanceDataStore.ts` refactored** - `syncWithBackend()` function added
3. **OCR Apply simplified** - Now calls backend then syncs ALL data:
   - `refreshAircraft()` for hours
   - `syncWithBackend()` for parts/AD-SB/invoices
4. **Auto-sync on screen open** - Parts and Invoices screens sync automatically

### ✅ Data Persistence Fixes (Session 6 - January 6, 2025)
1. **`report-settings.tsx` crash fix** - Added missing `useEffect` import + `KeyboardAvoidingView`
2. **Aircraft local data persistence** - New system in `aircraftLocalStore.ts`:
   - Extra fields (category, engineType, maxWeight, baseOperations, photo, etc.) now persisted to `SecureStore`
   - Backend API only supports limited fields; local data merged on load
   - Photo URI stored locally (not sent to backend as it's a local file path)
3. **TypeScript fixes** - Fixed type casting in `ocr-history.tsx` for dynamic backend fields

## File Structure
```
/app/
├── app/                  
│   ├── (tabs)/          
│   │   ├── aircraft/    
│   │   │   ├── ocr-history.tsx    # Modal + sync
│   │   │   ├── ocr-scan.tsx       # Simplified apply
│   │   │   ├── edit.tsx           # Photo + local fields
│   │   │   └── maintenance/
│   │   │       ├── parts.tsx       # Auto-sync on open
│   │   │       ├── invoices.tsx    # Auto-sync on open
│   │   │       ├── report-settings.tsx # Persisted settings
│   │   │       └── ...
│   └── _layout.tsx      
├── services/            
│   ├── maintenanceService.ts  # Parts/ADSB/STC/Invoices API
│   └── ocrService.ts
└── stores/              
    ├── aircraftLocalStore.ts    # MODIFIED: SecureStore for local fields
    ├── maintenanceDataStore.ts  # syncWithBackend()
    ├── reportSettingsStore.ts   # SecureStore persistence
    └── ...
```

## Architecture: Frontend ↔ Backend Sync Flow

```
┌─────────────────────────────────────────────────────────┐
│                    OCR Apply Flow                       │
├─────────────────────────────────────────────────────────┤
│  1. User clicks "Apply" on OCR scan                     │
│  2. Frontend: POST /api/ocr/apply/:scan_id              │
│  3. Backend: Updates aircraft hours, creates parts, etc │
│  4. Frontend: GET /api/aircraft (refreshAircraft)       │
│  5. Frontend: GET /api/parts, /api/adsb, /api/invoices │
│  6. Local stores updated with fresh backend data        │
└─────────────────────────────────────────────────────────┘
```

## Known Issues
1. **OCR Backend Validation** - Backend may reject scans with null part fields
2. **OCR Quota Limit** - User limited to 3 scans/month (backend config)

## Test Credentials
- Email: lima@123.com
- Password: lima123

## Backlog / Future Tasks
- Backend: Increase OCR quota for testing
- Backend: Make OCR extracted fields optional
- Add offline mode with queue sync
- Push notifications for maintenance reminders
