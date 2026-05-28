# 🎭 Mafia Klan — Zulmat Kuchlari Bot

Telegram guruh chatlar uchun anime personajli Mafia o'yini boti.

## O'rnatish

```bash
npm install
```

## Ishga tushirish

1. `.env.example` faylini nusxalab `.env` yarating:
   ```
   cp .env.example .env
   ```

2. `.env` faylga tokeningizni kiriting:
   ```
   TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
   ```

3. Botni ishga tushiring:
   ```bash
   npm run dev
   ```

## Guruhda o'yin boshlash

| Buyruq | Tavsif |
|--------|--------|
| `/newgame` | Yangi o'yin yaratish |
| `/join` | O'yinga qo'shilish |
| `/startgame` | O'yinni boshlash |
| `/endgame` | O'yinni bekor qilish |
| `/players` | O'yinchilar ro'yxati |
| `/deathnote @username` | Light Yagami qobiliyati |

> ⚠️ O'yinchilar avval botga lichkada `/start` yuborishlari kerak!

## Rollar

**🔴 Mafiya:** Madara, Aizen, Sukuna, Muzan, Light Yagami, Kabuto  
**🔵 Shahar:** Tsunade, Unahana, Tomioka, Rengoku, Erwin Smith  
**🟡 Maxsus:** Subaru, Obito, Guts  
**⚪ Tinch aholi:** Rin, Zero Two, Hiro, Marin, Takimichi, Mayki

Minimal o'yinchilar: **4 kishi**
