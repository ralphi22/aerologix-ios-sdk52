# AeroLogix AI - Product Requirements Document

## Project Overview
**App Name**: AeroLogix AI  
**Platform**: iOS (React Native with Expo SDK 52)  
**Purpose**: Aviation maintenance tracking application for aircraft owners/operators  
**Languages**: Bilingual (English / French)  

## Core Principles
- **TC-SAFE**: All screens must display disclaimers that the app is informational only and does not replace official AME/TEA records
- **Offline-First**: Most features operate with local state (React Context) until backend integration is explicitly requested
- **Locked Environment**: No SDK upgrades or new package installations allowed

## Tech Stack (Locked)
- Framework: React Native + Expo (Managed Workflow, SDK ~52)
- Navigation: Expo Router (file-system based)
- State Management: React Context API
- Storage: expo-secure-store (for persistent flags)
- HTTP Client: axios
- i18n: Custom utility (no dependencies)

---

## Implemented Features

### Phase 1: Auth & Legal (Completed)
- [x] Disclaimer gate with persistent acceptance (SecureStore)
- [x] Login screen (backend-connected via /api/auth/login)
- [x] Sign Up screen (UI only, no backend)
- [x] Bilingual support (EN/FR)

### Phase 2: Core Navigation (Completed)
- [x] 3-tab layout: Aircraft | EKO (AI Assistant) | Profile
- [x] Tab icons and labels with i18n

### Phase 3: Aircraft Module (Completed)
- [x] Aircraft list screen
- [x] Add aircraft modal
- [x] Aircraft detail screen
- [x] Edit aircraft screen
- [x] Delete aircraft functionality
- [x] Local CRUD via aircraftLocalStore

### Phase 4: Maintenance Module (Completed)
- [x] Maintenance main menu (5 sub-modules)
- [x] Report dashboard with progress bars
- [x] Report settings screen
- [x] **Parts screen** - visual storage with CRUD, OCR mock, TC-Safe disclaimer
- [x] **AD/SB screen** - AD and SB list with type badges, CRUD, OCR mock, TC-Safe disclaimer
- [x] **STC screen** - STC list with CRUD, OCR mock, TC-Safe disclaimer
- [x] **Invoices screen** - Full financial tracking module:
  - Invoice list with supplier, date, amounts
  - Financial analysis section (total annual, hourly cost)
  - Add invoice modal with parts/labor/hours breakdown
  - Invoice detail screen with OCR data display
  - Manual correction capability for OCR values
  - Visual badges (parts, labor, hours)
  - TC-Safe financial disclaimers
- [x] MaintenanceDataProvider integrated in root layout

### Phase 5: ELT Module (Completed)
- [x] **ELT Screen** - Full Emergency Locator Transmitter tracking:
  - Visual status indicator (green/orange/red)
  - Progress bars for test cycle (12 months) and battery (24-72 months)
  - Editable key dates (activation, service, test, battery change, expiry)
  - ELT identification fields (manufacturer, model, serial, hex code)
  - **ELT Type selector** (121.5 MHz, 406 MHz, 406 MHz + GPS)
  - Canadian ELT Beacon Registry link (external)
  - TC-Safe disclaimers (bilingual)
- [x] **ELT OCR Scanner** - Document extraction with user validation:
  - Document type selection (maintenance report, ELT certificate, battery label, registration)
  - Mock OCR detection with confidence levels
  - Field-by-field validation (user must confirm each field)
  - Support for all ELT fields via OCR
  - OCR disclaimer (data must be validated by user)
- [x] EltProvider integrated in root layout
- [x] Report module consumes ELT data (read-only)
- [x] Aircraft detail screen shows dynamic ELT status

---

## Pending / Upcoming Tasks

### P1 - Backend Integration
- [ ] Connect Sign Up to backend API
- [ ] Migrate aircraft data to backend persistence
- [ ] Connect maintenance data to backend

### P1 - Additional Modules
- [ ] Log Book module
- [ ] W/B (Weight & Balance) module

### P2 - Advanced Features
- [ ] Real OCR functionality (image scanning for documents)
- [ ] Share with AME/AMO feature
- [ ] EKO AI Assistant (LLM integration)
- [ ] Subscription management

### ELT Data
```typescript
type EltType = '121.5 MHz' | '406 MHz' | '406 MHz + GPS' | '';

interface EltData {
  manufacturer: string;
  model: string;
  serialNumber: string;
  eltType: EltType;            // Type d'ELT
  hexCode: string;             // 406 MHz hex code
  activationDate: string;      // Date d'activation ELT
  serviceDate: string;         // Date de mise en service
  lastTestDate: string;        // Dernier test ELT (cycle 12 mois)
  lastBatteryDate: string;     // Dernier changement batterie
  batteryExpiryDate: string;   // Expiration batterie
  aircraftId: string;
  lastOcrScanDate: string;     // Date du dernier scan OCR
  ocrValidated: boolean;       // User has validated OCR data
}

interface OcrScanRecord {
  id: string;
  documentType: 'maintenance_report' | 'elt_certificate' | 'battery_label' | 'registration' | 'other';
  scanDate: string;
  detectedData: OcrDetectedData;
  validated: boolean;
  aircraftId: string;
}
```

---

## Data Models (Local State)

### Aircraft
```typescript
interface Aircraft {
  id: string;
  registration: string;
  commonName: string;
  model: string;
  serialNumber: string;
  airframeHours: number;
  engineHours: number;
  propellerHours: number;
  // ... additional fields
}
```

### Part
```typescript
interface Part {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  installedDate: string;
  aircraftId: string;
}
```

### AD/SB
```typescript
interface AdSb {
  id: string;
  type: 'AD' | 'SB';
  number: string;
  description: string;
  dateAdded: string;
  aircraftId: string;
}
```

### STC
```typescript
interface Stc {
  id: string;
  number: string;
  reference: string;
  description: string;
  dateAdded: string;
  aircraftId: string;
}
```

### Invoice
```typescript
interface Invoice {
  id: string;
  supplier: string;
  date: string;
  partsAmount: number;
  laborAmount: number;
  hoursWorked: number;
  totalAmount: number;
  aircraftId: string;
  notes: string;
}
```

---

## API Endpoints (Current)
- `POST /api/auth/login` - User authentication

---

## File Structure
```
/app/
├── app/
│   ├── (tabs)/
│   │   ├── aircraft/
│   │   │   ├── maintenance/
│   │   │   │   ├── index.tsx      # Maintenance menu
│   │   │   │   ├── report.tsx     # Report dashboard
│   │   │   │   ├── report-settings.tsx
│   │   │   │   ├── parts.tsx      # Parts list
│   │   │   │   ├── ad-sb.tsx      # AD/SB list
│   │   │   │   ├── stc.tsx        # STC list
│   │   │   │   └── invoices.tsx   # Invoices (placeholder)
│   │   │   └── ...
│   │   ├── eko/
│   │   └── profile/
│   ├── _layout.tsx      # Root with all providers
│   ├── login.tsx
│   └── signup.tsx
├── stores/
│   ├── aircraftLocalStore.ts
│   ├── reportSettingsStore.ts
│   └── maintenanceDataStore.ts
├── components/
│   └── disclaimer-gate.tsx
├── services/
│   ├── api.ts
│   └── authService.ts
└── i18n.ts
```

---

## Changelog

### 2024-12-31
- **ELT OCR Scanner**: Added document scanning with user validation:
  - Document type selection (4 types)
  - Mock OCR with confidence levels per field
  - Field-by-field validation requirement
  - No automatic data storage without user confirmation
- **ELT Type Field**: Added ELT type selector (121.5 MHz, 406 MHz, 406 MHz + GPS)
- **ELT Module Complete**: Full Emergency Locator Transmitter tracking:
  - Visual status indicator (operational/attention/check required)
  - Progress bars for test cycle and battery
  - Editable dates and ELT identification
  - Canadian ELT Beacon Registry link
  - Report integration (read-only consumption)
  - Aircraft detail dynamic status
- **Invoices Module Complete**: Full financial tracking with:
  - Invoice list with cards showing supplier, date, total, badges
  - Financial analysis: annual total, hours flown, estimated hourly cost
  - Invoice detail screen with OCR data and manual correction
  - Add/delete invoice functionality
  - Bilingual disclaimers (TC-Safe financial)
- Verified and completed Parts, AD/SB, STC screens implementation
- Added MaintenanceDataProvider to root layout
- All screens include TC-Safe bilingual disclaimers
- OCR functionality mocked with alert messages
