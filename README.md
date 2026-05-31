# 🎰 Mines Signal Bot

Professional Telegram bot — Mines o'yini uchun signal beruvchi bot.

---

## 📦 O'rnatish

```bash
cd mines-bot
npm install
cp .env.example .env
```

`.env` faylini tahrirlang:

```
BOT_TOKEN=BotFather dan olgan tokeningiz
ADMIN_IDS=Telegram ID raqamingiz
ADMIN_USERNAME=telegram_username
```

> 💡 Telegram ID ni bilish uchun @userinfobot ga yozing

---

## 🚀 Ishga tushirish

```bash
npm start
```

Yoki dev rejimida (auto-restart):
```bash
npm run dev
```

---

## ✨ Imkoniyatlar

### 👤 Foydalanuvchi
- `/start` — Botni boshlash
- 🎯 **Signal olish** — 5x5 jadvaldan hujayralar tanlash va signal olish
- 💳 **Obuna sotib olish** — Tarif tanlash va to'lov
- 👤 **Mening profilim** — Obuna holati va statistika

### 💳 Tariflar
| Tarif | Narx | Muddat |
|-------|------|--------|
| 🥈 1 Oylik | 30,000 UZS | 30 kun |
| 🥇 3 Oylik | 90,000 UZS | 90 kun |

### 👨‍💼 Admin Panel (`/admin`)
- 👥 Foydalanuvchilar ro'yxati
- 💳 To'lovlarni ko'rish va tasdiqlash/rad etish
- ✅ Faol obunalar
- 📊 To'liq statistika (daromad, signallar)
- 📣 Broadcast — barcha foydalanuvchilarga xabar
- 👮 Admin qo'shish/o'chirish
- 🎯 Qo'lda obuna berish

### ⚡ Admin buyruqlari
```
/admin           — Admin panelni ochish
/addadmin <id>   — Admin qo'shish
/removeadmin <id>— Admin o'chirish
/givesub <id> <1|3> — Qo'lda obuna berish
```

---

## 🗂️ Fayl tuzilmasi

```
mines-bot/
├── index.js        — Asosiy bot
├── database.js     — Ma'lumotlar bazasi (JSON)
├── signal.js       — Signal generatori
├── subscription.js — Obuna tekshirish
├── admin.js        — Admin panel
├── data.json       — Ma'lumotlar (avtomatik yaratiladi)
├── package.json
└── .env
```

---

## 🔔 To'lov jarayoni

```
Foydalanuvchi tarif tanlaydi
        ↓
To'lov ma'lumotlari ko'rsatiladi
        ↓
Foydalanuvchi chek rasmini yuboradi
        ↓
Admin xabar oladi (Tasdiqlash/Rad etish)
        ↓
Admin tasdiqlasa → Obuna faollashadi
Foydalanuvchiga xabar ketadi ✅
```

---

## 📝 Eslatmalar

- `data.json` fayli avtomatik yaratiladi
- Bot to'xtatilsa, ma'lumotlar saqlanib qoladi
- Katta hajmda foydalanuvchi uchun SQLite yoki PostgreSQL ga o'tish tavsiya etiladi
