# Library Work Automate

Complete Library Management System with QR Code Attendance Tracking

## Features

### Owner Features:
- ✅ Student Management (Add/Edit/Remove)
- ✅ QR Code Generation with GPS Location
- ✅ Attendance Log (Real-time monitoring)
- ✅ Payment Management
- ✅ WhatsApp Group Link Management

### Student Features:
- ✅ QR Code Scanner for Attendance
- ✅ Real GPS Location Verification (20-30m range)
- ✅ Multiple Attendance Cycles (IN/OUT timestamps)
- ✅ Attendance History with timestamps
- ✅ WhatsApp Group Access
- ✅ Real Camera Integration

## New Features Added:

1. **Student Login Button** - Matches Owner Login style with gradient effects
2. **WhatsApp Group Button** - Direct link to join WhatsApp group
3. **GPS Location Setup**:
   - Auto Location: Uses device GPS
   - Manual Fill: Enter coordinates manually
4. **QR Code Generation**:
   - Only works after location is set
   - Generates QR with embedded GPS coordinates
   - Print functionality
5. **Real Camera Scanner**:
   - Opens device camera
   - Scans QR code
   - Verifies location within 20-30m range
   - Marks attendance only if in range
6. **Multiple Attendance Cycles**:
   - First scan: "10:05am IN"
   - Second scan: "10:05am-2:15pm OUT"
   - Third scan: "3:00pm IN" (new cycle)
7. **Attendance History**:
   - Shows all IN/OUT timestamps
   - Monthly grid view
   - Owner can also view all attendance

## Tech Stack

- React 18 (Vite)
- QR Code Generation & Scanning
- Geolocation API
- Camera API
- LocalStorage for data persistence
- Responsive Design (PC/Tablet/Mobile)

## Credentials

**Owner Login:**
- Mobile: 6201530654
- Password: Avinash

**Student Login:**
- Add students from Owner dashboard
- Auto-generated credentials

## Installation

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run build
npm run deploy
```

## URLs

- Development: http://localhost:3000
- Production: Will be deployed to Cloudflare Pages

## Important Notes

1. **Location Permission**: App requires location access for attendance
2. **Camera Permission**: App requires camera access for QR scanning
3. **Range Check**: Attendance only marks within 30 meters of library location
4. **Multiple Cycles**: Students can mark IN/OUT multiple times per day
5. **Responsive**: Works on all devices (PC, Tablet, Mobile)

## Browser Support

- Chrome (Recommended)
- Firefox
- Safari
- Edge

All modern browsers with camera and location support.

## Data Storage

All data is stored in browser's LocalStorage:
- Student Records
- Attendance Records
- Payment Records
- GPS Location
- WhatsApp Link

## Screenshots

[Add screenshots here after deployment]

## License

MIT License

## Author

Created for Library Work Automate System
