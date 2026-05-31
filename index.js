require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const express = require('express');
const db = require('./database');
const { generateSignal } = require('./signal');
const { getSubscription } = require('./subscription');
const adminPanel = require('./admin');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// ─── START ───────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const user = ctx.from;
  await db.saveUser({
    id: user.id,
    username: user.username || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    joined_at: new Date().toISOString(),
  });

  const sub = await getSubscription(user.id);
  const isActive = sub && new Date(sub.expires_at) > new Date();

  await ctx.reply(
    `🎰 *MINES SIGNAL BOT*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Salom, *${user.first_name}*! 👋\n\n` +
    `Bu bot sizga Mines o'yinida yuqori aniqlikdagi signallar beradi.\n\n` +
    `${isActive ? '✅ *Obunangiz faol!*' : '❌ *Obunangiz yo\'q*'}\n\n` +
    `Pastdagi menyudan foydalaning 👇`,
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['🎯 Signal olish', '💳 Obuna sotib olish'],
        ['👤 Mening profilim', '📊 Statistika'],
        ['ℹ️ Yordam', '📞 Bog\'lanish'],
      ]).resize(),
    }
  );
});

// ─── SIGNAL ──────────────────────────────────────────────────────────────────
bot.hears('🎯 Signal olish', async (ctx) => {
  const userId = ctx.from.id;
  const sub = await getSubscription(userId);
  const isActive = sub && new Date(sub.expires_at) > new Date();

  if (!isActive) {
    return ctx.reply(
      `🔒 *Signal olish uchun obuna kerak!*\n\n` +
      `Obuna tariflarini ko'rish uchun pastdagi tugmani bosing 👇`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('💳 Obuna sotib olish', 'buy_sub')],
        ]),
      }
    );
  }

  ctx.session = ctx.session || {};
  ctx.session.selected = [];

  await ctx.reply(
    `🎯 *SIGNAL OLISH*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Quyidagi 5x5 jadvaldan hujayralarni tanlang.\n` +
    `Bot sizga qaysi hujayra xavfsizligini aniqlaydi.\n\n` +
    `✅ — Tanlangan  |  ⬜ — Tanlanmagan\n\n` +
    `Kamida 1 ta hujayra tanlang, keyin *Tahlil qil* tugmasini bosing.`,
    {
      parse_mode: 'Markdown',
      ...buildGrid([]),
    }
  );
});

function buildGrid(selected = []) {
  const rows = [];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      const label = selected.includes(idx) ? `✅` : `${idx + 1}`;
      row.push(Markup.button.callback(label, `cell_${idx}`));
    }
    rows.push(row);
  }
  rows.push([
    Markup.button.callback('🔄 Tozalash', 'clear_grid'),
    Markup.button.callback('🚀 Tahlil qil', 'analyze_grid'),
  ]);
  return Markup.inlineKeyboard(rows);
}

bot.action(/^cell_(\d+)$/, async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.selected = ctx.session.selected || [];
  const idx = parseInt(ctx.match[1]);

  if (ctx.session.selected.includes(idx)) {
    ctx.session.selected = ctx.session.selected.filter((i) => i !== idx);
  } else {
    ctx.session.selected.push(idx);
  }

  await ctx.editMessageReplyMarkup(buildGrid(ctx.session.selected).reply_markup);
  await ctx.answerCbQuery(
    ctx.session.selected.includes(idx)
      ? `✅ ${idx + 1}-hujayra tanlandi`
      : `❌ ${idx + 1}-hujayra olib tashlandi`
  );
});

bot.action('clear_grid', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.selected = [];
  await ctx.editMessageReplyMarkup(buildGrid([]).reply_markup);
  await ctx.answerCbQuery('🔄 Tozalandi');
});

bot.action('analyze_grid', async (ctx) => {
  ctx.session = ctx.session || {};
  const selected = ctx.session.selected || [];

  if (selected.length === 0) {
    return ctx.answerCbQuery('⚠️ Kamida 1 ta hujayra tanlang!', { show_alert: true });
  }

  await ctx.answerCbQuery('🔍 Tahlil qilinmoqda...');
  await ctx.editMessageText('⏳ *Signal tahlil qilinmoqda...*\n\nIltimos kuting...', {
    parse_mode: 'Markdown',
  });

  await new Promise((r) => setTimeout(r, 1500));

  const signal = generateSignal(selected);
  await db.logSignal(ctx.from.id, selected, signal);

  const gridDisplay = buildSignalDisplay(signal);

  await ctx.editMessageText(
    `🎯 *MINES SIGNAL NATIJASI*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${gridDisplay}\n` +
    `💎 *Xavfsiz:* ${signal.safe.map((i) => i + 1).join(', ')}\n` +
    `💣 *Xavfli:* ${signal.danger.map((i) => i + 1).join(', ')}\n\n` +
    `🎯 *Aniqlik:* ${signal.accuracy}%\n` +
    `⚡ *Signal kuchi:* ${signal.strength}\n\n` +
    `⏰ ${new Date().toLocaleTimeString('uz-UZ')}\n\n` +
    `⚠️ _Eslatma: Mas'uliyat o'zingizda!_`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Yangi signal', 'new_signal')],
      ]),
    }
  );
});

bot.action('new_signal', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.selected = [];
  await ctx.editMessageText(
    `🎯 *SIGNAL OLISH*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Hujayralarni tanlang va tahlil qiling 👇`,
    { parse_mode: 'Markdown', ...buildGrid([]) }
  );
  await ctx.answerCbQuery();
});

function buildSignalDisplay(signal) {
  let display = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      if (signal.safe.includes(idx)) display += '💎';
      else if (signal.danger.includes(idx)) display += '💣';
      else display += '⬜';
    }
    display += '\n';
  }
  return display;
}

// ─── SUBSCRIPTION ─────────────────────────────────────────────────────────────
bot.hears('💳 Obuna sotib olish', async (ctx) => {
  await showSubscriptionPlans(ctx);
});

bot.action('buy_sub', async (ctx) => {
  await ctx.answerCbQuery();
  await showSubscriptionPlans(ctx);
});

async function showSubscriptionPlans(ctx) {
  const sub = await getSubscription(ctx.from.id);
  const isActive = sub && new Date(sub.expires_at) > new Date();

  const subStatus = isActive
    ? `✅ *Joriy obunangiz:* ${sub.plan_name}\n📅 *Tugash:* ${new Date(sub.expires_at).toLocaleDateString('uz-UZ')}\n\n`
    : `❌ *Obunangiz yo\u2019q*\n\n`;

  await ctx.reply(
    `💳 *OBUNA TARIFLARI*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    subStatus +
    `🥈 *1 OYLIK TARIF*\n` +
    `├ Narxi: *30,000 UZS*\n` +
    `├ Signal cheksiz\n` +
    `├ 5x5 jadval\n` +
    `└ 24/7 qo'llab-quvvatlash\n\n` +
    `🥇 *3 OYLIK TARIF*\n` +
    `├ Narxi: *90,000 UZS*\n` +
    `├ Signal cheksiz\n` +
    `├ 5x5 jadval\n` +
    `├ VIP signal kanalga kirish\n` +
    `└ 24/7 qo'llab-quvvatlash\n\n` +
    `💰 To'lov: Click, Payme, Uzcard\n\n` +
    `Tarifni tanlang 👇`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🥈 1 Oylik — 30,000 UZS', 'plan_1month')],
        [Markup.button.callback('🥇 3 Oylik — 90,000 UZS', 'plan_3month')],
      ]),
    }
  );
}

bot.action(/^plan_(1month|3month)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const plan = ctx.match[1];
  const planData = {
    '1month': { name: '1 Oylik', price: 30000 },
    '3month': { name: '3 Oylik', price: 90000 },
  }[plan];

  const paymentId = await db.createPaymentRequest(ctx.from.id, plan, planData.price);
  const cardNumber = process.env.CARD_NUMBER || '8600 0000 0000 0000';
  const cardOwner = process.env.CARD_OWNER || 'Mines Signal Bot';

  await ctx.reply(
    `💳 *TO'LOV MA'LUMOTLARI*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📦 Tarif: *${planData.name}*\n` +
    `💰 Summa: *${planData.price.toLocaleString()} UZS*\n` +
    `🆔 To'lov ID: \`${paymentId}\`\n\n` +
    `💳 *Karta:*\n` +
    `┌ Raqam: \`${cardNumber}\`\n` +
    `└ Egasi: ${cardOwner}\n\n` +
    `✅ To'lovdan so'ng chek rasmini yuboring.\n` +
    `⏰ Ko'rib chiqish vaqti: 1–24 soat`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📤 Chek yuborish', `send_receipt_${paymentId}`)],
        [Markup.button.callback('❌ Bekor qilish', 'cancel_payment')],
      ]),
    }
  );
});

bot.action(/^send_receipt_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const paymentId = ctx.match[1];
  ctx.session = ctx.session || {};
  ctx.session.awaitingReceipt = paymentId;

  await ctx.reply(
    `📸 *Chek rasmini yuboring*\n\n` +
    `To'lov cheki yoki screenshot rasmini yuboring.\n` +
    `Admin ko'rib chiqadi va obuna faollashtiriladi.`,
    { parse_mode: 'Markdown' }
  );
});

bot.action('cancel_payment', async (ctx) => {
  await ctx.answerCbQuery('❌ Bekor qilindi');
  await ctx.deleteMessage();
});

// ─── RECEIPT PHOTO ────────────────────────────────────────────────────────────
bot.on('photo', async (ctx) => {
  ctx.session = ctx.session || {};
  if (!ctx.session.awaitingReceipt) return;

  const paymentId = ctx.session.awaitingReceipt;
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  await db.updatePaymentReceipt(paymentId, fileId, ctx.from.id);

  const admins = await db.getAdmins();
  for (const admin of admins) {
    try {
      await bot.telegram.sendPhoto(admin.user_id, fileId, {
        caption:
          `🔔 *YANGI TO'LOV SO'ROVI*\n\n` +
          `👤 ${ctx.from.first_name} (@${ctx.from.username || 'noma\'lum'})\n` +
          `🆔 ID: \`${ctx.from.id}\`\n` +
          `🧾 To'lov ID: \`${paymentId}\``,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Tasdiqlash', `approve_${paymentId}`),
            Markup.button.callback('❌ Rad etish', `reject_${paymentId}`),
          ],
        ]),
      });
    } catch (e) {}
  }

  ctx.session.awaitingReceipt = null;
  await ctx.reply(
    `✅ *Chek yuborildi!*\n\n` +
    `To'lovingiz ko'rib chiqilmoqda.\n` +
    `Tasdiqlangandan so'ng xabar beriladi.\n\n` +
    `⏰ Ko'rib chiqish: 1–24 soat`,
    { parse_mode: 'Markdown' }
  );
});

// ─── APPROVE / REJECT ─────────────────────────────────────────────────────────
bot.action(/^approve_(.+)$/, async (ctx) => {
  if (!(await db.isAdmin(ctx.from.id))) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
  const paymentId = ctx.match[1];
  const payment = await db.getPayment(paymentId);
  if (!payment) return ctx.answerCbQuery('❌ To\'lov topilmadi');

  const months = payment.plan === '1month' ? 1 : 3;
  const planName = payment.plan === '1month' ? '1 Oylik' : '3 Oylik';
  await db.activateSubscription(payment.user_id, months, planName, paymentId, ctx.from.id);

  await ctx.answerCbQuery('✅ Tasdiqlandi!');
  await ctx.editMessageCaption(
    (ctx.callbackQuery.message.caption || '') + `\n\n✅ TASDIQLANDI — ${ctx.from.first_name}`,
    { parse_mode: 'Markdown' }
  );

  try {
    await bot.telegram.sendMessage(
      payment.user_id,
      `🎉 *OBUNANGIZ FAOLLASHTIRILDI!*\n\n` +
      `📦 Tarif: *${planName}*\n` +
      `⏰ Tugash: *${new Date(Date.now() + months * 30 * 24 * 3600 * 1000).toLocaleDateString('uz-UZ')}*\n\n` +
      `Endi signallardan foydalaning! 🎯`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}
});

bot.action(/^reject_(.+)$/, async (ctx) => {
  if (!(await db.isAdmin(ctx.from.id))) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
  const paymentId = ctx.match[1];
  const payment = await db.getPayment(paymentId);
  if (!payment) return ctx.answerCbQuery('❌ To\'lov topilmadi');

  await db.rejectPayment(paymentId, ctx.from.id);
  await ctx.answerCbQuery('❌ Rad etildi');
  await ctx.editMessageCaption(
    (ctx.callbackQuery.message.caption || '') + `\n\n❌ RAD ETILDI — ${ctx.from.first_name}`,
    { parse_mode: 'Markdown' }
  );

  try {
    await bot.telegram.sendMessage(
      payment.user_id,
      `❌ *To'lovingiz rad etildi.*\n\nAdmin bilan bog'laning: @${process.env.ADMIN_USERNAME || 'admin'}`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}
});

// ─── PROFILE ─────────────────────────────────────────────────────────────────
bot.hears('👤 Mening profilim', async (ctx) => {
  const userId = ctx.from.id;
  const sub = await getSubscription(userId);
  const isActive = sub && new Date(sub.expires_at) > new Date();
  const stats = await db.getUserStats(userId);
  const daysLeft = isActive
    ? Math.ceil((new Date(sub.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  await ctx.reply(
    `👤 *MENING PROFILIM*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🆔 ID: \`${userId}\`\n` +
    `👤 Ism: ${ctx.from.first_name}\n` +
    `📧 Username: @${ctx.from.username || 'yo\'q'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💳 *OBUNA HOLATI*\n` +
    `${isActive
      ? `✅ Faol — ${sub.plan_name}\n📅 Qolgan: ${daysLeft} kun\n📆 Tugash: ${new Date(sub.expires_at).toLocaleDateString('uz-UZ')}`
      : `❌ Obuna yo\u2019q`}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *STATISTIKA*\n` +
    `🎯 Jami signal: ${stats.total_signals}\n` +
    `📅 Bugungi: ${stats.today_signals}\n` +
    `📆 Ro'yxatdan: ${new Date(stats.joined_at).toLocaleDateString('uz-UZ')}`,
    { parse_mode: 'Markdown' }
  );
});

bot.hears('📊 Statistika', async (ctx) => {
  const stats = await db.getGlobalStats();
  await ctx.reply(
    `📊 *BOT STATISTIKASI*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👥 Foydalanuvchilar: ${stats.total_users}\n` +
    `✅ Faol obunalar: ${stats.active_subs}\n` +
    `🎯 Bugungi signallar: ${stats.today_signals}\n` +
    `📡 Jami signallar: ${stats.total_signals}`,
    { parse_mode: 'Markdown' }
  );
});

bot.hears('ℹ️ Yordam', async (ctx) => {
  await ctx.reply(
    `ℹ️ *YORDAM*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎯 *Signal olish:*\n` +
    `Obuna oling → 5x5 jadvaldan hujayralar tanlang → Signal oling\n\n` +
    `💳 *Tariflar:*\n` +
    `• 1 Oylik: 30,000 UZS\n` +
    `• 3 Oylik: 90,000 UZS\n\n` +
    `⚠️ Bu bot faqat yordam berish maqsadida. Mas'uliyat foydalanuvchida.`,
    { parse_mode: 'Markdown' }
  );
});

bot.hears('📞 Bog\'lanish', async (ctx) => {
  await ctx.reply(
    `📞 *BOG'LANISH*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👨‍💼 Admin: @${process.env.ADMIN_USERNAME || 'admin'}\n` +
    `⏰ Ish vaqti: 09:00 — 23:00`,
    { parse_mode: 'Markdown' }
  );
});

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
bot.command('admin', async (ctx) => {
  if (!(await db.isAdmin(ctx.from.id))) return ctx.reply('⛔ Ruxsat yo\'q');
  await adminPanel.showPanel(ctx, bot);
});

adminPanel.register(bot, db);

// ─── RENDER WEBHOOK SERVER ───────────────────────────────────────────────────
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN; // e.g. https://your-app.onrender.com
const SECRET_PATH = `/webhook/${process.env.BOT_TOKEN}`;

if (WEBHOOK_DOMAIN) {
  // Production: webhook mode (Render)
  app.use(bot.webhookCallback(SECRET_PATH));

  app.get('/', (req, res) => res.send('🎰 Mines Signal Bot is running!'));

  app.listen(PORT, async () => {
    console.log(`🚀 Server started on port ${PORT}`);
    await bot.telegram.setWebhook(`${WEBHOOK_DOMAIN}${SECRET_PATH}`);
    console.log(`✅ Webhook set: ${WEBHOOK_DOMAIN}${SECRET_PATH}`);
  });
} else {
  // Development: long polling mode
  app.get('/', (req, res) => res.send('🎰 Mines Signal Bot is running (polling)!'));
  app.listen(PORT, () => console.log(`🌐 Health check server on port ${PORT}`));

  bot.launch().then(() => console.log('🚀 Bot polling rejimida ishlamoqda'));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
