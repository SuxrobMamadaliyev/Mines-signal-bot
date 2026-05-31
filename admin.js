const { Markup } = require('telegraf');

async function showPanel(ctx, bot) {
  const db = require('./database');
  const stats = await db.getGlobalStats();
  const pending = await db.getPendingPayments();

  await ctx.reply(
    `👨‍💼 *ADMIN PANEL*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 *Statistika:*\n` +
    `👥 Foydalanuvchilar: ${stats.total_users}\n` +
    `✅ Faol obunalar: ${stats.active_subs}\n` +
    `🎯 Bugungi signallar: ${stats.today_signals}\n` +
    `📡 Jami signallar: ${stats.total_signals}\n\n` +
    `🔔 Kutilayotgan to'lovlar: ${pending.length}`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👥 Foydalanuvchilar', 'admin_users'),
         Markup.button.callback('💳 To\'lovlar', 'admin_payments')],
        [Markup.button.callback('✅ Obunalar', 'admin_subs'),
         Markup.button.callback('📊 Statistika', 'admin_stats')],
        [Markup.button.callback('📣 Xabar yuborish', 'admin_broadcast'),
         Markup.button.callback('👮 Adminlar', 'admin_admins')],
        [Markup.button.callback('🎯 Obuna berish', 'admin_give_sub'),
         Markup.button.callback('🔔 Kutayotganlar', 'admin_pending')],
      ]),
    }
  );
}

function register(bot, db) {
  // ─── USERS ─────────────────────────────────────────────────────────────────
  bot.action('admin_users', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();

    const users = await db.getAllUsers();
    const page = 0;
    const perPage = 10;
    const slice = users.slice(page * perPage, (page + 1) * perPage);

    let text = `👥 *FOYDALANUVCHILAR* (${users.length} ta)\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const u of slice) {
      const sub = await db.getSubscription(u.id);
      const isActive = sub && new Date(sub.expires_at) > new Date();
      text += `${isActive ? '✅' : '❌'} ${u.first_name} (@${u.username || 'yo\'q'}) — \`${u.id}\`\n`;
    }
    if (users.length > perPage) {
      text += `\n_... va yana ${users.length - perPage} ta_`;
    }

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔍 ID bo\'yicha qidirish', 'admin_search_user')],
        [Markup.button.callback('🔙 Orqaga', 'admin_back')],
      ]),
    });
  });

  // ─── PAYMENTS ──────────────────────────────────────────────────────────────
  bot.action('admin_payments', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();

    const payments = await db.getAllPayments();
    const recent = payments.slice(0, 10);

    let text = `💳 *TO'LOVLAR* (${payments.length} ta)\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const p of recent) {
      const statusIcon = { pending: '⏳', receipt_sent: '📤', approved: '✅', rejected: '❌' }[p.status] || '❓';
      text += `${statusIcon} \`${p.id}\` — ${p.amount.toLocaleString()} UZS — ${p.plan}\n`;
    }

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔔 Kutayotganlar', 'admin_pending')],
        [Markup.button.callback('🔙 Orqaga', 'admin_back')],
      ]),
    });
  });

  // ─── PENDING PAYMENTS ──────────────────────────────────────────────────────
  bot.action('admin_pending', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();

    const pending = await db.getPendingPayments();
    if (pending.length === 0) {
      return ctx.editMessageText(
        `🔔 *Kutayotgan to'lovlar yo'q*\n\nHamma to'lovlar ko'rib chiqilgan.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]),
        }
      );
    }

    let text = `🔔 *KUTAYOTGAN TO'LOVLAR* (${pending.length} ta)\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const p of pending) {
      text += `📤 \`${p.id}\` — User: ${p.user_id} — ${p.amount.toLocaleString()} UZS\n`;
    }

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        ...pending.slice(0, 5).map((p) => [
          Markup.button.callback(`✅ ${p.id}`, `approve_${p.id}`),
          Markup.button.callback(`❌ ${p.id}`, `reject_${p.id}`),
        ]),
        [Markup.button.callback('🔙 Orqaga', 'admin_back')],
      ]),
    });
  });

  // ─── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
  bot.action('admin_subs', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();

    const subs = await db.getActiveSubscriptions();
    let text = `✅ *FAOL OBUNALAR* (${subs.length} ta)\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const s of subs.slice(0, 15)) {
      const days = Math.ceil((new Date(s.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
      text += `👤 \`${s.user_id}\` — ${s.plan_name} — ${days} kun qoldi\n`;
    }

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎯 Obuna berish', 'admin_give_sub')],
        [Markup.button.callback('🔙 Orqaga', 'admin_back')],
      ]),
    });
  });

  // ─── STATS ─────────────────────────────────────────────────────────────────
  bot.action('admin_stats', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();

    const stats = await db.getGlobalStats();
    const payments = await db.getAllPayments();
    const approved = payments.filter((p) => p.status === 'approved');
    const totalRevenue = approved.reduce((sum, p) => sum + p.amount, 0);

    const subs1m = approved.filter((p) => p.plan === '1month').length;
    const subs3m = approved.filter((p) => p.plan === '3month').length;

    await ctx.editMessageText(
      `📊 *TO'LIQ STATISTIKA*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👥 *Foydalanuvchilar:* ${stats.total_users}\n` +
      `✅ *Faol obunalar:* ${stats.active_subs}\n\n` +
      `💳 *To'lovlar:*\n` +
      `├ Jami: ${payments.length} ta\n` +
      `├ Tasdiqlangan: ${approved.length} ta\n` +
      `├ 1 oylik: ${subs1m} ta\n` +
      `└ 3 oylik: ${subs3m} ta\n\n` +
      `💰 *Jami daromad:* ${totalRevenue.toLocaleString()} UZS\n\n` +
      `🎯 *Signallar:*\n` +
      `├ Bugungi: ${stats.today_signals}\n` +
      `└ Jami: ${stats.total_signals}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]),
      }
    );
  });

  // ─── BROADCAST ─────────────────────────────────────────────────────────────
  bot.action('admin_broadcast', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();
    ctx.session = ctx.session || {};
    ctx.session.awaitingBroadcast = true;

    await ctx.editMessageText(
      `📣 *XABAR YUBORISH*\n\n` +
      `Barcha foydalanuvchilarga yuboriladigan xabarni kiriting.\n\n` +
      `❌ Bekor qilish uchun /admin ni yuboring.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'admin_back')]]),
      }
    );
  });

  bot.on('text', async (ctx, next) => {
    ctx.session = ctx.session || {};
    if (!ctx.session.awaitingBroadcast) return next();
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return next();

    ctx.session.awaitingBroadcast = false;
    const message = ctx.message.text;
    const users = await db.getAllUsers();
    let sent = 0, failed = 0;

    await ctx.reply(`📣 Xabar yuborilmoqda... (${users.length} ta foydalanuvchi)`);

    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(
          user.id,
          `📣 *YANGILIK*\n\n${message}`,
          { parse_mode: 'Markdown' }
        );
        sent++;
      } catch (e) {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 50)); // rate limit
    }

    await ctx.reply(
      `✅ *Xabar yuborildi!*\n\n` +
      `✅ Muvaffaqiyatli: ${sent}\n` +
      `❌ Xatolik: ${failed}`,
      { parse_mode: 'Markdown' }
    );
  });

  // ─── ADMINS ────────────────────────────────────────────────────────────────
  bot.action('admin_admins', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();

    await ctx.editMessageText(
      `👮 *ADMINLAR BOSHQARUVI*\n\n` +
      `Admin qo'shish: \`/addadmin <user_id>\`\n` +
      `Admin o'chirish: \`/removeadmin <user_id>\``,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]),
      }
    );
  });

  bot.command('addadmin', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.reply('⛔ Ruxsat yo\'q');
    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) return ctx.reply('Foydalanish: /addadmin <user_id>');
    const newAdminId = parts[1];
    await db.addAdmin(newAdminId);
    await ctx.reply(`✅ \`${newAdminId}\` admin qilindi!`, { parse_mode: 'Markdown' });
  });

  bot.command('removeadmin', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.reply('⛔ Ruxsat yo\'q');
    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) return ctx.reply('Foydalanish: /removeadmin <user_id>');
    await db.removeAdmin(parts[1]);
    await ctx.reply(`✅ \`${parts[1]}\` admin o'chirildi!`, { parse_mode: 'Markdown' });
  });

  // ─── GIVE SUBSCRIPTION ─────────────────────────────────────────────────────
  bot.action('admin_give_sub', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();

    await ctx.editMessageText(
      `🎯 *OBUNA BERISH*\n\n` +
      `Foydalanish:\n` +
      `\`/givesub <user_id> <1|3>\`\n\n` +
      `Misol: \`/givesub 123456789 1\` (1 oylik)\n` +
      `Misol: \`/givesub 123456789 3\` (3 oylik)`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]),
      }
    );
  });

  bot.command('givesub', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.reply('⛔ Ruxsat yo\'q');
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) return ctx.reply('Foydalanish: /givesub <user_id> <1|3>');
    const userId = parts[1];
    const months = parseInt(parts[2]);
    if (![1, 3].includes(months)) return ctx.reply('Faqat 1 yoki 3 oy bo\'lishi mumkin');

    const planName = months === 1 ? '1 Oylik' : '3 Oylik';
    await db.activateSubscription(userId, months, planName, 'MANUAL', ctx.from.id);

    await ctx.reply(`✅ \`${userId}\` ga ${months} oylik obuna berildi!`, { parse_mode: 'Markdown' });
    try {
      await ctx.telegram.sendMessage(
        userId,
        `🎉 *Sizga ${planName} obuna berildi!*\n\nBot adminidan sovg'a 🎁`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  });

  // ─── BACK ──────────────────────────────────────────────────────────────────
  bot.action('admin_back', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();
    const stats = await db.getGlobalStats();
    const pending = await db.getPendingPayments();

    await ctx.editMessageText(
      `👨‍💼 *ADMIN PANEL*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📊 *Statistika:*\n` +
      `👥 Foydalanuvchilar: ${stats.total_users}\n` +
      `✅ Faol obunalar: ${stats.active_subs}\n` +
      `🎯 Bugungi signallar: ${stats.today_signals}\n` +
      `📡 Jami signallar: ${stats.total_signals}\n\n` +
      `🔔 Kutilayotgan to'lovlar: ${pending.length}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('👥 Foydalanuvchilar', 'admin_users'),
           Markup.button.callback('💳 To\'lovlar', 'admin_payments')],
          [Markup.button.callback('✅ Obunalar', 'admin_subs'),
           Markup.button.callback('📊 Statistika', 'admin_stats')],
          [Markup.button.callback('📣 Xabar yuborish', 'admin_broadcast'),
           Markup.button.callback('👮 Adminlar', 'admin_admins')],
          [Markup.button.callback('🎯 Obuna berish', 'admin_give_sub'),
           Markup.button.callback('🔔 Kutayotganlar', 'admin_pending')],
        ]),
      }
    );
  });

  // ─── SEARCH USER ───────────────────────────────────────────────────────────
  bot.action('admin_search_user', async (ctx) => {
    const adminCheck = await db.isAdmin(ctx.from.id);
    if (!adminCheck) return ctx.answerCbQuery('⛔ Ruxsat yo\'q');
    await ctx.answerCbQuery();
    ctx.session = ctx.session || {};
    ctx.session.awaitingUserSearch = true;
    await ctx.reply(
      `🔍 Foydalanuvchi ID sini kiriting:`,
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { showPanel, register };
