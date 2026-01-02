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

### ✅ Bug Fixes (Session 2 - January 2, 2025)
1. **Crash "Cannot read property 'toFixed' of null"** - Fixed null checks before toFixed() calls
2. **Report screen crash** - Added missing `ReportSettingsProvider` to root layout
3. **calculateDateProgress crash** - Added validation for empty/invalid dates
4. **calculateHoursProgress crash** - Added validation for null values and division by zero
5. **Missing redLight color** - Added to COLORS constant in ocr-history.tsx

## File Structure
```
/app/
├── app/                  # Expo Router routes
│   ├── (tabs)/          # Main app screens
│   │   ├── aircraft/    # Aircraft features
│   │   │   ├── ocr-history.tsx    # Fixed: toFixed null check
│   │   │   ├── ocr-scan.tsx       # Fixed: toFixed null check
│   │   │   └── maintenance/
│   │   │       ├── report.tsx      # Fixed: date/hours validation
│   │   │       ├── parts.tsx       # Fixed: keyboard handling
│   │   │       └── report-settings.tsx
│   ├── _layout.tsx      # Fixed: Added ReportSettingsProvider
│   └── login.tsx
├── components/          # Reusable UI
├── services/            # API services
│   ├── api.ts
│   ├── aircraftService.ts
│   └── ocrService.ts
└── stores/              # State management
    ├── aircraftLocalStore.ts
    ├── eltStore.ts
    └── reportSettingsStore.ts
```

## Known Issues
1. **OCR Backend Error** - 500 Internal Server Error from Render. The backend tries to call OpenAI Vision API but receives a 404. This is a backend configuration issue, not a frontend problem.

## Test Credentials
- Email: lima@123.com
- Password: lima123

## Backlog / Future Tasks
- Investigate and fix backend OCR integration with OpenAI
- Add navigation to OCR scan detail view (currently just logs)
- Implement delete functionality for OCR scans
- Add more document types for OCR
- Implement offline mode
- Add push notifications for maintenance reminders
