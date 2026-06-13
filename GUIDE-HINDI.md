# 📘 SiteKhata - उपयोग गाइड (हिंदी)

## 🎯 SiteKhata क्या है?

**SiteKhata** एक कॉन्ट्रैक्टर कैश बुक सिस्टम है जो आपके सभी साइट का हिसाब-किताब एक जगह रखता है। हर साइट का अलग-अलग लेजर, रियल टाइम में profit-loss, और प्रोफेशनल PDF रिपोर्ट।

---

## 🔐 1. लॉगिन करना

### पहली बार कैसे खोलें?

1. ब्राउज़र में जाएं: `http://localhost:8080/auth`
2. **Password Box** में डालें: `345rrt`
3. **"खोलो"** बटन दबाएं
4. सीधे Dashboard में पहुंच जाएंगे!

> **नोट:** गलत पासवर्ड डालने पर "Galat password!" error दिखेगा।

---

## 📊 2. Dashboard - मुख्य पेज

जब आप लॉगिन करेंगे, तो सबसे पहले **Owner Dashboard** दिखेगा। यहां आपको मिलेगा:

### ऊपर के Stats Cards:
- **Total Sites** - कुल कितनी साइट्स हैं
- **Funds Received** - कुल कितना पैसा आया (हरे रंग में)
- **Total Spent** - कुल कितना खर्च हुआ (लाल रंग में)
- **Cash in Hand** - हाथ में बची हुई नकदी
- **Total Diesel** - सभी साइट पर डीजल का खर्च (पीला)
- **Equipment Cost** - मशीन का कुल खर्च (नीला)
- **Advances Given** - दिया गया एडवांस (नारंगी)
- **Fund Installments** - कितनी बार फंड मिला

### Fund Installments List:
सभी साइट्स पर जितनी बार पैसा आया है, उसकी लिस्ट। हर entry में:
- किस साइट पर आया
- कितना amount
- कौन से date पर

### Chart:
बार चार्ट में सभी साइट का Received vs Spent दिखता है।

### Sites की लिस्ट:
सभी साइट्स के cards दिखेंगे:
- **Received** (इन) - हरा
- **Spent** (आउट) - लाल
- **Diesel** - पीला
- **Advances** - नारंगी
- **Balance** - नीला

किसी भी साइट card पर क्लिक करें तो उस साइट का पूरा detail खुल जाएगा।

---

## 🏗️ 3. Sites - साइट मैनेज करना

### नई साइट कैसे बनाएं?

1. Dashboard से **"Sites"** link पर जाएं या ऊपर navbar में **"Sites"** क्लिक करें
2. ऊपर **"New Site"** बटन दबाएं
3. फॉर्म भरें:
   - **Site name** (जैसे: Sagar Side NH-146)
   - **Location** (जैसे: Sagar, MP)
   - **Description** (optional - कोई भी details)
4. **"Add Site"** बटन दबाएं

### साइट Edit कैसे करें?

1. साइट card पर माउस ले जाएं (hover करें)
2. ऊपर दाहिने कोने में **पेंसिल आइकन** दिखेगा - उस पर क्लिक करें
3. जानकारी बदलें
4. **"Save Changes"** दबाएं

### साइट Delete कैसे करें?

1. साइट card पर माउस ले जाएं
2. **डस्टबिन आइकन** दिखेगा - उस पर क्लिक करें
3. Confirm करने पर साइट और सारी entries delete हो जाएंगी

> **⚠️ सावधान:** साइट डिलीट करने पर सारी entries भी हमेशा के लिए मिट जाएंगी!

---

## 💰 4. Entry Kaise Add Karein? (हिसाब भरना)

किसी भी साइट पर क्लिक करने के बाद:

### Step 1: "Add Entry" बटन दबाएं

### Step 2: Entry Type चुनें
दो tab होंगे:
- **Debit (Spent)** - लाल - पैसा खर्च हुआ (जैसे: मजदूर, डीजल, मटेरियल)
- **Credit (Received)** - हरा - पैसा मिला (जैसे: फंड आया)

### Step 3: Details भरें

#### जरूरी फील्ड:
- **Date** - कब का entry है
- **Amount ₹** - कितना amount
- **Category** - कौन सा category (dropdown से चुनें)
- **Particular / विवरण** - क्या था entry, detail में लिखें

#### Categories की List:

**Credit (पैसा आने पर):**
- Fund Received / नकद प्राप्त

**Debit (खर्च होने पर):**
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

#### Extra Options:

**जब Equipment category चुनें:**
- **Equipment/Machine** dropdown दिखेगा
- Machine name चुन सकते हैं (जैसे: JCB, Poclain, Hyva, etc.)
- ये optional है

**जब Labour category चुनें:**
- **Labour Role** dropdown दिखेगा
- Role चुन सकते हैं (जैसे: Mason/राजमिस्त्री, Helper/हेल्पर, Driver/ड्राइवर, etc.)
- ये भी optional है

### Step 4: Save करें
सब भर लिया तो **"Save"** बटन दबाएं। Entry table में दिख जाएगी।

---

## 📝 5. Entry Edit और Delete कैसे करें?

### Edit करना:
1. Cash Ledger table में entry के आगे **पेंसिल आइकन** पर क्लिक करें
2. Details बदलें
3. **"Update"** दबाएं

### Delete करना:
1. Entry के आगे **डस्टबिन आइकन** पर क्लिक करें
2. Confirm करें - entry हट जाएगी

---

## 📊 6. Site Detail Page - क्या-क्या दिखता है?

जब आप किसी साइट को खोलते हैं, तो ये सब मिलता है:

### 📈 Summary Cards (ऊपर):
- **Received** - कुल पैसा आया (हरा)
- **Spent** - कुल खर्च (लाल)
- **Balance** - बाकी बचा (नीला gradient)

### 📉 Charts:
1. **Daily Flow** - पिछले 14 दिन का line chart
2. **Top Expense Categories** - pie chart में top 5 categories

### 👷 Labour Payments:
- हर role (Mason, Helper, Driver, etc.) का अलग-अलग payment
- कितना % खर्च हुआ - progress bar में दिखता है
- Total labour cost

### 🚜 Equipment/Machine Log:
हर machine के लिए:
- **Diesel** - कितना डीजल (पीला)
- **Hire/Advance** - भाड़ा या एडवांस (नीला)
- **Repair** - मरम्मत (नारंगी)
- **Total** - कुल खर्च

### 💳 Advance Tracker:
- सभी advance entries की लिस्ट
- Date, Particular, Category, Amount
- Total advance show करता है

### 📒 Cash Ledger (Main Table):
सारी entries की पूरी लिस्ट:
- Date
- Particular
- Category
- Credit (हरा)
- Debit (लाल)
- **Balance** (running balance - automatically calculate होता है!)
- Edit/Delete buttons

> **Balance Auto Calculate होता है!** हर entry के बाद नया balance automatically दिखता है।

---

## 📄 7. Report कैसे निकालें?

Site detail page पर ऊपर दो buttons हैं:

### CSV Export:
1. **"CSV"** बटन दबाएं
2. Excel file download हो जाएगी
3. Excel में खोल सकते हैं

### Professional PDF Report:
1. **"PDF Report"** बटन दबाएं
2. 2 pages की PDF download होगी:

**Page 1 - Summary:**
- Site name और location
- Period (start date to end date)
- 4 KPI cards (Received, Spent, Balance, Entries)
- Category-wise breakdown table
- Advance tracker

**Page 2+ - Full Ledger:**
- सारी entries की complete table
- Date, Particular, Category, Credit, Debit, Balance
- हर page पर header और footer
- प्रोफेशनल design - client को भेजने के लिए बिल्कुल perfect!

> **PDF में Hindi text नहीं आएगा** - सिर्फ English part show होगा। ये PDF libraries की limitation है।

---

## 🎨 8. Features और Tips

### 🎯 Key Features:

✅ **Multiple Sites** - एक ही जगह से सभी sites मैनेज करें  
✅ **Real-time Balance** - हर entry के बाद automatic calculation  
✅ **Category Tracking** - diesel, labour, equipment अलग-अलग दिखता है  
✅ **Advance Tracker** - दिए गए advance को track करें  
✅ **Equipment Log** - हर machine का खर्च अलग  
✅ **Labour Breakdown** - role-wise payment  
✅ **Charts & Analytics** - visual graphs से समझें  
✅ **PDF Reports** - प्रोफेशनल reports clients को भेजें  
✅ **Easy Entry** - simple form, 30 seconds में entry add करें

### 💡 Pro Tips:

1. **Regular Entry डालें** - रोज का हिसाब रोज भरें, महीने भर का एकसाथ मत भरें
2. **Particular Detail में लिखें** - जैसे: "300 bags cement @350 from Gupta Traders"
3. **Equipment name हमेशा चुनें** - बाद में machine-wise report निकालना आसान हो जाएगा
4. **Labour role चुनें** - किस role में कितना खर्च हुआ, easily पता चल जाएगा
5. **PDF हफ्ते में एक बार निकालें** - backup के लिए अच्छा है
6. **Advance track करें** - Advance Tracker से देख लें कितना बाकी है

---

## 🚀 9. Live Deployment (Production में कैसे चलाएं?)

### Local पर Run करना:

```bash
# Terminal खोलें और project folder में जाएं
cd "d:\Sanat\Site Selection\site-profit-tracker\site-profit-tracker"

# Development mode में चलाएं
npm run dev

# Browser में खोलें
http://localhost:8080/auth
```

### Build और Production:

```bash
# Production build बनाएं
npm run build

# Production mode में चलाएं
npm run start
```

### Server पर Deploy करना:

**Option 1 - Vercel (Recommended):**
1. GitHub पर code push करें
2. Vercel account बनाएं (free)
3. GitHub repo connect करें
4. Auto-deploy हो जाएगा!

**Option 2 - Railway/Render:**
- Similar process
- Free tier available
- `.env` file की settings add करना ना भूलें

**Option 3 - अपना Server (VPS):**
- Ubuntu server पर Node.js install करें
- PM2 से app run करें
- Nginx reverse proxy setup करें

---

## 🔧 10. Troubleshooting (Problems का Solution)

### Problem: Password नहीं चल रहा
**Solution:** `345rrt` exactly डालें, कोई space नहीं होना चाहिए।

### Problem: Entry add नहीं हो रही
**Solution:** 
- Amount field में कुछ डाला है?
- Date select किया है?
- Category चुना है?

### Problem: PDF download नहीं हो रही
**Solution:** Browser की popup settings check करें, allow कर दें।

### Problem: Site delete नहीं हो रही
**Solution:** पहले confirm dialog आएगा, "OK" दबाना पड़ेगा।

### Problem: Chart नहीं दिख रहा
**Solution:** कम से कम 2-3 entries add करें, तब chart दिखेगा।

---

## 📞 Support और Contact

अगर कोई problem आए या कुछ समझ ना आए, तो:

1. ये guide फिर से पढ़ें
2. Browser console check करें (F12 दबाकर)
3. Developer से contact करें

---

## 🎓 Quick Start Checklist

✅ पासवर्ड से लॉगिन करें: `345rrt`  
✅ पहली साइट बनाएं  
✅ First entry डालें (Credit - Fund Received)  
✅ कुछ expense entries add करें (Debit)  
✅ Dashboard check करें - balance दिख रहा है?  
✅ PDF report निकालें  
✅ रोज entry डालने की आदत बनाएं

---

## 📌 Important Notes

- **Password change करना हो** तो developer से संपर्क करें (code में change करना पड़ेगा)
- **Backup** के लिए हफ्ते में एक बार CSV export कर लें
- **Internet connection** चाहिए (Supabase database cloud पर है)
- **Mobile पर भी काम करेगा** - responsive design है

---

**🎉 बस! आप अब SiteKhata use करने के लिए तैयार हैं!**

**Simple याद रखें:** 
- Login → Site बनाओ → Entry डालो → Report निकालो
- Password: `345rrt`
- हर दिन का हिसाब रोज भरो = हमेशा clear rahega!

**Happy Accounting! 💰📊**
