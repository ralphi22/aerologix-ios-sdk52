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

## Current Status (January 2025)

### ✅ Completed Features
- Application restored from backup
- Aircraft persistence with backend sync
- OCR system implementation (frontend)
- Aircraft photo upload and watermark display
- Editable maintenance report settings
- ELT tracking screen

### ✅ Bug Fixes (Session 1)
1. **Crash on Report screen** - Fixed missing `ELT_FIXED_LIMITS` import
2. **Parts modal keyboard issue** - Added `KeyboardAvoidingView` for mobile keyboard handling
3. **Aircraft ID mapping** - Improved to support both `id` and `_id` formats

### ✅ Bug Fixes (Session 2)
1. **Crash "Cannot read property 'toFixed' of null"** - Fixed null checks before toFixed() calls
2. **Report screen crash** - Added missing `ReportSettingsProvider` to root layout
3. **Missing redLight color** - Added to COLORS constant in ocr-history.tsx

### ✅ Bug Fixes (Session 3 - January 2, 2025)
1. **All Context Providers crash-safe** - All hooks now return default values instead of throwing errors:
   - `useReportSettings` - returns default settings/limits
   - `useElt` - returns default ELT data
   - `useAircraftLocalStore` - returns empty aircraft list
   - `useMaintenanceData` - returns empty data
   - `useOcr` - returns empty documents
2. **Report Screen protections** - Safe defaults for settings/limits objects
3. **ELT Store calculations** - Added validation for invalid dates and division by zero
4. **Battery/Test progress** - Changed default status from 'expired' to 'operational'

## File Structure
```
/app/
├── app/                  # Expo Router routes
│   ├── (tabs)/          # Main app screens
│   │   ├── aircraft/    # Aircraft features
│   │   │   ├── ocr-history.tsx    # Fixed: toFixed null check
│   │   │   ├── ocr-scan.tsx       # Fixed: toFixed null check
│   │   │   └── maintenance/
│   │   │       ├── report.tsx      # Fixed: safe defaults
│   │   │       ├── parts.tsx       # Fixed: keyboard handling
│   │   │       └── report-settings.tsx
│   ├── _layout.tsx      # Fixed: Added ReportSettingsProvider
│   └── login.tsx
├── components/          # Reusable UI
├── services/            # API services
└── stores/              # All stores now crash-safe
    ├── aircraftLocalStore.ts  # Hook with fallback
    ├── eltStore.ts            # Hook with fallback + calc fixes
    ├── maintenanceDataStore.ts # Hook with fallback
    ├── ocrStore.ts            # Hook with fallback
    └── reportSettingsStore.ts # Hook with fallback
```

## Known Issues
1. **OCR Backend Error** - 500 Internal Server Error from Render. Backend OpenAI configuration issue.

## Test Credentials
- Email: lima@123.com
- Password: lima123

## Backlog / Future Tasks
- Investigate and fix backend OCR integration with OpenAI
- Add navigation to OCR scan detail view
- Implement delete functionality for OCR scans
- Implement offline mode
- Add push notifications for maintenance reminders
