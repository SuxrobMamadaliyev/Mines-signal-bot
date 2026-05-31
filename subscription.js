const db = require('./database');

async function getSubscription(userId) {
  return await db.getSubscription(userId);
}

async function isSubscribed(userId) {
  const sub = await db.getSubscription(userId);
  return sub && new Date(sub.expires_at) > new Date();
}

module.exports = { getSubscription, isSubscribed };
