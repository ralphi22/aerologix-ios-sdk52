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

### ✅ Bug Fixes (This Session)
1. **Crash on Report screen** - Fixed missing `ELT_FIXED_LIMITS` import
2. **Parts modal keyboard issue** - Added `KeyboardAvoidingView` for mobile keyboard handling
3. **Aircraft ID mapping** - Improved to support both `id` and `_id` formats

### ⚠️ Known Issues
1. **OCR Backend Error** - The OCR scan returns 404 from OpenAI API. This is a backend configuration issue on Render, not a frontend problem.

## File Structure
```
/app/
├── app/                  # Expo Router routes
│   ├── (tabs)/          # Main app screens
│   │   ├── aircraft/    # Aircraft features
│   │   │   └── maintenance/
│   │   │       ├── report.tsx      # Fixed: ELT limits
│   │   │       ├── parts.tsx       # Fixed: keyboard handling
│   │   │       └── report-settings.tsx
│   ├── _layout.tsx
│   └── login.tsx
├── components/          # Reusable UI
├── services/            # API services
│   ├── api.ts
│   ├── aircraftService.ts
│   └── ocrService.ts
└── stores/              # State management
    ├── aircraftLocalStore.ts  # Fixed: ID mapping
    └── eltStore.ts
```

## Test Credentials
- Email: lima@123.com
- Password: lima123

## Backlog / Future Tasks
- Investigate and fix backend OCR integration with OpenAI
- Add more document types for OCR
- Implement offline mode
- Add push notifications for maintenance reminders
