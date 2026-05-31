# 🎰 Mines Signal Bot

Professional Telegram bot — Mines o'yini uchun signal beruvchi bot.  
**Render.com** da deploy qilish uchun tayyor.

---

## 📦 O'rnatish (Local)

```bash
npm install
cp .env.example .env
# .env faylini tahrirlang
npm run dev
```

---

## 🚀 Render.com ga Deploy qilish

### 1. GitHub ga yuklash
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/sizning-username/mines-bot.git
git push -u origin main
```

### 2. Render.com da yangi Web Service yaratish
- render.com ga kiring → **New → Web Service**
- GitHub repo ni ulang
- Quyidagi sozlamalarni kiriting:

| Sozlama | Qiymat |
|---------|--------|
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Free |

### 3. Environment Variables qo'shish
Render dashboard → **Environment** bo'limiga kiring:

```
BOT_TOKEN          = BotFather dan olgan token
ADMIN_IDS          = 123456789
ADMIN_USERNAME     = sizning_username
WEBHOOK_DOMAIN     = https://your-app.onrender.com   ← Render beradi
CARD_NUMBER        = 8600 0000 0000 0000
CARD_OWNER         = Ism Familiya
```

> ⚠️ `WEBHOOK_DOMAIN` ni Render bergan URL bilan to'ldiring.  
> URL formatı: `https://your-app-name.onrender.com`

### 4. Deploy
**Create Web Service** tugmasini bosing. Bot avtomatik ishga tushadi!

---

## 🗂️ Fayl tuzilmasi

```
mines-bot/
├── index.js        — Asosiy bot + Express webhook server
├── database.js     — JSON bazasi
├── signal.js       — Signal generatori
├── subscription.js — Obuna tekshirish
├── admin.js        — Admin panel
├── package.json
├── .env.example    — Sozlamalar namunasi
└── data.json       — Ma'lumotlar (avtomatik yaratiladi)
```

---

## ✨ Imkoniyatlar

### 👤 Foydalanuvchi
| Tugma | Vazifa |
|-------|--------|
| 🎯 Signal olish | 5x5 jadvaldan hujayralar tanlash |
| 💳 Obuna sotib olish | Tarif tanlash va to'lov |
| 👤 Mening profilim | Obuna holati va statistika |
| 📊 Statistika | Bot umumiy statistikasi |

### 💳 Tariflar
| Tarif | Narx | Muddat |
|-------|------|--------|
| 🥈 1 Oylik | 30,000 UZS | 30 kun |
| 🥇 3 Oylik | 90,000 UZS | 90 kun |

### 👨‍💼 Admin Panel (`/admin`)
- 👥 Foydalanuvchilar ro'yxati
- 💳 To'lovlar — tasdiqlash / rad etish
- ✅ Faol obunalar
- 📊 To'liq statistika + daromad
- 📣 Broadcast — barcha foydalanuvchilarga xabar
- 👮 Admin qo'shish / o'chirish
- 🎯 Qo'lda obuna berish

### ⚡ Admin buyruqlari
```
/admin                   — Admin panelni ochish
/addadmin <id>           — Admin qo'shish
/removeadmin <id>        — Admin o'chirish
/givesub <id> <1|3>      — Qo'lda obuna berish
```

---

## 🔔 To'lov jarayoni

```
Foydalanuvchi tarif tanlaydi
        ↓
Karta ma'lumotlari ko'rsatiladi
        ↓
Foydalanuvchi chek rasmini yuboradi
        ↓
Admin Tasdiqlash / Rad etish tugmasini bosadi
        ↓
Obuna avtomatik faollashadi ✅
Foydalanuvchiga xabar ketadi
```

---

## ℹ️ Eslatmalar

- `data.json` avtomatik yaratiladi
- Render free plan — 15 daqiqa faoliyat bo'lmasa server "uxlaydi", birinchi so'rovda ~30s kechikadi
- Ko'p foydalanuvchi uchun SQLite yoki PostgreSQL tavsiya etiladi
