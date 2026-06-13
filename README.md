# 🏗️ SiteKhata - Contractor Cash Book

Multi-site cash management system for contractors. Track credit/debit entries, generate professional reports, and monitor real-time profit/loss across all construction sites.

## 🔐 Quick Start

### Login
- Navigate to: `http://localhost:8080/auth`
- Password: `345rrt`
- Click "Kholo" to enter

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## 📚 Features

### 💼 Multi-Site Management
- Create unlimited sites
- Individual cash ledger for each site
- Edit/delete sites

### 💰 Cash Tracking
- Credit entries (funds received)
- Debit entries (expenses)
- Auto-calculated running balance
- 12+ expense categories

### 📊 Analytics & Reports
- Owner dashboard with aggregate stats
- Site-wise credit/debit breakdown
- Diesel tracking
- Equipment cost tracking
- Labour payment tracking
- Advance tracker
- Daily flow charts
- Category-wise pie charts

### 👷 Advanced Features
- **Equipment Log**: Track diesel, hire, and repair costs per machine
- **Labour Breakdown**: Role-wise payment tracking (Mason, Helper, Driver, etc.)
- **Advance Tracker**: Monitor all advance payments
- **PDF Reports**: Professional 2-page reports with charts and tables
- **CSV Export**: Excel-compatible data export

## 📁 Project Structure

```
site-profit-tracker/
├── src/
│   ├── routes/
│   │   ├── _authenticated/
│   │   │   ├── dashboard.tsx      # Owner dashboard
│   │   │   ├── sites.tsx          # Sites list
│   │   │   ├── sites.$siteId.tsx  # Site detail & ledger
│   │   │   └── analytics.tsx      # Analytics page
│   │   ├── auth.tsx               # Simple password gate
│   │   └── index.tsx              # Landing page
│   ├── components/                # UI components
│   ├── lib/
│   │   ├── use-auth.ts           # LocalStorage auth
│   │   └── constants.ts          # Categories & helpers
│   └── integrations/
│       └── supabase/             # Supabase client
├── .env                          # Environment variables
├── GUIDE-HINDI.md               # Full Hindi user guide
└── package.json
```

## 🎯 Categories

### Credit
- Fund Received / नकद प्राप्त

### Debit
- Material / सामग्री
- Labour / मजदूर
- Labour Advance / मजदूर एडवांस
- Equipment Hire / मशीन भाड़ा
- Equipment Advance / मशीन एडवांस
- Diesel / डीजल
- Consultancy / कन्सल्टेंसी
- Repair / मरम्मत
- Supervisor Expense / सुपरवाइजर खर्च
- Advance / एडवांस
- Transfer / ट्रांसफर
- Other / अन्य

## 📄 Reports

### CSV Export
- Complete ledger data
- Date, Particular, Category, Credit, Debit, Balance

### PDF Report (Professional)

**Page 1 - Executive Summary:**
- Site header with location & period
- 4 KPI cards (Received, Spent, Balance, Entries)
- Expense breakdown by category
- Advance tracker

**Page 2+ - Full Cash Ledger:**
- Complete entry-by-entry table
- Auto-calculated running balance
- Professional header/footer on each page

## 🔧 Tech Stack

- **Framework**: TanStack Start (React + SSR)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + Radix UI
- **Charts**: Recharts
- **PDF**: jsPDF + jsPDF-AutoTable
- **Auth**: LocalStorage (simple password gate)

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Push to GitHub
git push origin main

# Connect on Vercel dashboard
# Auto-deploy!
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

## 📖 Documentation

**For Users (Hindi):** See [GUIDE-HINDI.md](./GUIDE-HINDI.md) - Complete step-by-step user guide in Hindi

## 🔐 Security Note

Current authentication is simplified with a single password (`345rrt`) stored in localStorage. For production:
- Consider implementing proper user authentication
- Add role-based access control (Owner vs Supervisor)
- Use environment variables for sensitive configs

## 🎨 UI Features

- Responsive design (mobile & desktop)
- Dark mode support via Tailwind
- Hindi + English labels
- Color-coded entries (green=credit, red=debit)
- Auto-saving forms
- Toast notifications
- Loading states

## 📊 Database Schema

### Sites Table
- id, name, location, description
- created_by, created_at

### Entries Table
- id, site_id, entry_date
- particular, category
- credit, debit
- created_by, created_at

## 💡 Usage Tips

1. **Regular entries** - Add daily, not monthly
2. **Detailed particulars** - Write specific details
3. **Use equipment names** - Enable machine-wise tracking
4. **Select labour roles** - Get role-wise breakdowns
5. **Weekly PDF backups** - Export for records
6. **Monitor advances** - Track outstanding amounts

## 🐛 Known Limitations

- Hindi text doesn't render in PDF (jsPDF limitation) - only English portion shown
- Single-user authentication (no multi-user support yet)
- No offline mode (requires internet for Supabase)

## 📞 Support

For issues or questions, refer to:
1. [GUIDE-HINDI.md](./GUIDE-HINDI.md) - User documentation
2. Browser console (F12) for errors
3. Developer contact

---

**Made for contractors, by developers who understand construction! 🏗️💼**
