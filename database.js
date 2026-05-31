const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      users: {},
      subscriptions: {},
      payments: {},
      signals: [],
      admins: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7).toUpperCase();
}

// ─── USERS ────────────────────────────────────────────────────────────────────
async function saveUser(user) {
  const db = loadDB();
  if (!db.users[user.id]) {
    db.users[user.id] = { ...user };
  } else {
    db.users[user.id] = { ...db.users[user.id], ...user };
  }
  saveDB(db);
}

async function getUser(userId) {
  const db = loadDB();
  return db.users[userId] || null;
}

async function getAllUsers() {
  const db = loadDB();
  return Object.values(db.users);
}

// ─── ADMINS ───────────────────────────────────────────────────────────────────
async function isAdmin(userId) {
  const db = loadDB();
  const envAdmins = (process.env.ADMIN_IDS || '').split(',').map((id) => id.trim());
  return db.admins.includes(String(userId)) || envAdmins.includes(String(userId));
}

async function getAdmins() {
  const db = loadDB();
  const envAdmins = (process.env.ADMIN_IDS || '').split(',').map((id) => ({ user_id: id.trim() }));
  const dbAdmins = db.admins.map((id) => ({ user_id: id }));
  const all = [...envAdmins, ...dbAdmins];
  const seen = new Set();
  return all.filter((a) => {
    if (seen.has(a.user_id)) return false;
    seen.add(a.user_id);
    return a.user_id;
  });
}

async function addAdmin(userId) {
  const db = loadDB();
  if (!db.admins.includes(String(userId))) {
    db.admins.push(String(userId));
    saveDB(db);
  }
}

async function removeAdmin(userId) {
  const db = loadDB();
  db.admins = db.admins.filter((id) => id !== String(userId));
  saveDB(db);
}

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
async function getSubscription(userId) {
  const db = loadDB();
  return db.subscriptions[userId] || null;
}

async function activateSubscription(userId, months, planName, paymentId, adminId) {
  const db = loadDB();
  const now = new Date();
  const expires = new Date(now.getTime() + months * 30 * 24 * 3600 * 1000);
  db.subscriptions[userId] = {
    user_id: userId,
    plan: months === 1 ? '1month' : '3month',
    plan_name: planName,
    activated_at: now.toISOString(),
    expires_at: expires.toISOString(),
    payment_id: paymentId,
    approved_by: adminId,
  };
  if (db.payments[paymentId]) {
    db.payments[paymentId].status = 'approved';
    db.payments[paymentId].processed_at = now.toISOString();
    db.payments[paymentId].processed_by = adminId;
  }
  saveDB(db);
}

async function getActiveSubscriptions() {
  const db = loadDB();
  const now = new Date();
  return Object.values(db.subscriptions).filter((s) => new Date(s.expires_at) > now);
}

async function getAllSubscriptions() {
  const db = loadDB();
  return Object.values(db.subscriptions);
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
async function createPaymentRequest(userId, plan, amount) {
  const db = loadDB();
  const id = generateId();
  db.payments[id] = {
    id,
    user_id: userId,
    plan,
    amount,
    status: 'pending',
    created_at: new Date().toISOString(),
    receipt_file_id: null,
  };
  saveDB(db);
  return id;
}

async function updatePaymentReceipt(paymentId, fileId, userId) {
  const db = loadDB();
  if (db.payments[paymentId]) {
    db.payments[paymentId].receipt_file_id = fileId;
    db.payments[paymentId].status = 'receipt_sent';
    db.payments[paymentId].receipt_at = new Date().toISOString();
    saveDB(db);
  }
}

async function getPayment(paymentId) {
  const db = loadDB();
  return db.payments[paymentId] || null;
}

async function rejectPayment(paymentId, adminId) {
  const db = loadDB();
  if (db.payments[paymentId]) {
    db.payments[paymentId].status = 'rejected';
    db.payments[paymentId].processed_at = new Date().toISOString();
    db.payments[paymentId].processed_by = adminId;
    saveDB(db);
  }
}

async function getAllPayments() {
  const db = loadDB();
  return Object.values(db.payments).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function getPendingPayments() {
  const db = loadDB();
  return Object.values(db.payments).filter((p) => p.status === 'receipt_sent');
}

// ─── SIGNALS ─────────────────────────────────────────────────────────────────
async function logSignal(userId, selected, signal) {
  const db = loadDB();
  db.signals.push({
    user_id: userId,
    selected,
    safe: signal.safe,
    danger: signal.danger,
    accuracy: signal.accuracy,
    created_at: new Date().toISOString(),
  });
  saveDB(db);
}

async function getUserStats(userId) {
  const db = loadDB();
  const user = db.users[userId] || {};
  const today = new Date().toDateString();
  const userSignals = db.signals.filter((s) => s.user_id === userId);
  const todaySignals = userSignals.filter((s) => new Date(s.created_at).toDateString() === today);
  return {
    total_signals: userSignals.length,
    today_signals: todaySignals.length,
    joined_at: user.joined_at || new Date().toISOString(),
  };
}

async function getGlobalStats() {
  const db = loadDB();
  const now = new Date();
  const today = now.toDateString();
  const activeSubsCount = Object.values(db.subscriptions).filter(
    (s) => new Date(s.expires_at) > now
  ).length;
  const todaySignals = db.signals.filter((s) => new Date(s.created_at).toDateString() === today);
  return {
    total_users: Object.keys(db.users).length,
    active_subs: activeSubsCount,
    today_signals: todaySignals.length,
    total_signals: db.signals.length,
  };
}

module.exports = {
  saveUser, getUser, getAllUsers,
  isAdmin, getAdmins, addAdmin, removeAdmin,
  getSubscription, activateSubscription, getActiveSubscriptions, getAllSubscriptions,
  createPaymentRequest, updatePaymentReceipt, getPayment, rejectPayment, getAllPayments, getPendingPayments,
  logSignal, getUserStats, getGlobalStats,
};
