# 📋 SiteKhata - Quick Reference (Print करो और रख लो!)

## 🔑 LOGIN
```
URL: http://localhost:8080/auth
Password: 345rrt
```

---

## 📌 MAIN SECTIONS

### 1️⃣ Dashboard (मुख्य पेज)
- सभी sites का summary
- Total received/spent/balance
- Charts और graphs
- Fund installments list

### 2️⃣ Sites (साइट लिस्ट)
- सभी sites की लिस्ट
- New site add करो
- Edit/Delete site

### 3️⃣ Site Detail (किसी साइट को खोलो)
- Cash ledger (सारी entries)
- Charts
- Equipment log
- Labour breakdown
- Advance tracker
- PDF/CSV download

---

## ➕ ENTRY कैसे डालें? (सिर्फ 4 Steps!)

### Step 1: Site खोलो → "Add Entry" button

### Step 2: Type चुनो
- **Credit** (पैसा आया) → हरा tab
- **Debit** (खर्च हुआ) → लाल tab

### Step 3: Fill करो
```
✅ Date       → entry की तारीख
✅ Amount ₹   → रकम
✅ Category   → dropdown से चुनो
✅ Particular → detail में लिखो
```

### Step 4: Save दबाओ! ✅

---

## 📂 CATEGORIES LIST

### 💚 Credit (पैसा आने पर):
- Fund Received / नकद प्राप्त

### 💔 Debit (खर्च होने पर):
```
✦ Material / सामग्री
✦ Labour / मजदूर
✦ Labour Advance / मजदूर एडवांस
✦ Equipment Hire / मशीन भाड़ा
✦ Equipment Advance / मशीन एडवांस
✦ Diesel / डीजल
✦ Consultancy / कन्सल्टेंसी
✦ Repair / मरम्मत
✦ Supervisor Expense / सुपरवाइजर खर्च
✦ Advance / एडवांस
✦ Transfer / ट्रांसफर
✦ Other / अन्य
```

---

## 🚜 EQUIPMENT NAMES (Machine चुनने के लिए)
```
• JCB                    • Roller
• Poclain / Excavator    • Water Tanker
• Hywa / Hyva / Tipper   • Crane
• Loader                 • Grader
• Dozer / Bulldozer      • Compressor
• Mixer                  • Generator
```

---

## 👷 LABOUR ROLES (Role चुनने के लिए)
```
• Mason / राजमिस्त्री    • Plumber / नलकार
• Helper / हेल्पर       • Electrician / बिजली मिस्त्री
• Driver / ड्राइवर      • Welder / वेल्डर
• Mistri / मिस्त्री     • Supervisor / सुपरवाइजर
• Operator / ऑपरेटर     • Guard / चौकीदार
• Carpenter / बढ़ई       • Other
```

---

## 📄 REPORTS कैसे निकालें?

### CSV Export:
```
Site detail page → CSV button → Excel file download
```

### PDF Report:
```
Site detail page → PDF Report button → Professional 2-page PDF
```

**PDF में क्या होगा?**
- Page 1: Summary + KPIs + Category breakdown + Advances
- Page 2+: Full cash ledger table

---

## ✏️ ENTRY EDIT/DELETE

### Edit:
```
Ledger table में → 🖊️ pencil icon → change करो → Update
```

### Delete:
```
Ledger table में → 🗑️ dustbin icon → confirm → deleted!
```

---

## 💡 PRO TIPS

✅ **रोज का हिसाब रोज भरो** - महीने भर इकट्ठा मत करो  
✅ **Detail में लिखो** - "cement 300 bags @350 from Gupta"  
✅ **Equipment name चुनो** - machine log automatically बन जाएगा  
✅ **Labour role चुनो** - role-wise tracking मिलेगा  
✅ **हफ्ते में PDF backup लो** - safety के लिए  
✅ **Advance track करो** - Advance Tracker देखते रहो

---

## 🎯 BALANCE कैसे काम करता है?

```
Balance = Total Credit - Total Debit

हरा (Positive) = पैसा बचा है ✅
लाल (Negative) = खर्च ज्यादा हो गया ⚠️
```

Balance **automatically** calculate होता है हर entry के बाद!

---

## ⚙️ SERVER कैसे चलाएं?

### Local पर:
```bash
cd site-profit-tracker
npm run dev
→ http://localhost:8080/auth
```

### Production Build:
```bash
npm run build
npm run start
```

---

## 🆘 COMMON PROBLEMS

| Problem | Solution |
|---------|----------|
| Password गलत | `345rrt` exactly डालो |
| Entry save नहीं हो रही | Amount और Date check करो |
| PDF download नहीं हो रही | Browser popup allow करो |
| Chart नहीं दिख रहा | 2-3 entries डालो पहले |

---

## 🎨 COLOR CODE याद रखो

```
🟢 हरा   = Credit / पैसा आया / Received
🔴 लाल   = Debit / खर्च हुआ / Spent
🟡 पीला  = Diesel
🟠 नारंगी = Advance
🔵 नीला  = Balance / Equipment
```

---

## 📞 KEYBOARD SHORTCUTS

```
Ctrl + Click on site card → Open in new tab
F5 → Refresh page
Ctrl + P → Print (इस page को!)
F12 → Developer console (troubleshooting)
```

---

## ✅ DAILY WORKFLOW

```
सुबह:
1. Login करो (345rrt)
2. अपनी site खोलो

दिन में:
3. जब खर्च हो → Debit entry डालो
4. पैसा मिले → Credit entry डालो

शाम को:
5. एक बार सब entries check करो
6. Balance देख लो

हफ्ते में:
7. PDF report निकाल लो (backup)
8. Dashboard charts देखो
```

---

## 🎓 3-MINUTE QUICK START

```
✅ Step 1: Login (345rrt)
✅ Step 2: New Site बनाओ
✅ Step 3: Credit entry - Fund Received (50000)
✅ Step 4: Debit entry - Diesel (5000)
✅ Step 5: Balance check करो (45000 दिखेगा!)
✅ Step 6: PDF निकालो
```

**बस! हो गया! 🎉**

---

## 📱 MOBILE पर भी काम करेगा!
Phone browser में same URL खोलो - responsive है पूरा!

---

**🔥 Tip: इस page को Print करके site office में चिपका दो!**

---

**Password: `345rrt`** ← ये याद रखो बस! 🔐

**Happy Accounting! 💰📊🏗️**
