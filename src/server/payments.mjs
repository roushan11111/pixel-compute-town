// PixelCompute Town — Three-in-One Payment Engine (Stablecoin USDC/USDT + Fiat Polar/Stripe + Redeem Codes) & Stablecoin Payouts

import crypto from 'node:crypto';
import { ensureStateSchema, PLATFORM_BOUNTY_FEE_PCT, round2 } from './seed.mjs';
import { getActiveUserContext, projectStateForUser, syncUserLeaderboard } from './auth.mjs';

export const STABLECOIN_CHAINS = Object.freeze(['base', 'bnb', 'ethereum', 'polygon', 'arbitrum', 'solana', 'tron']);
export const STABLECOIN_TOKENS = Object.freeze(['USDC', 'USDT']);
export const MIN_PAYOUT_USD = 5;

const DEFAULT_DEMO_EVM_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
const DEFAULT_DEMO_SOL_ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const DEFAULT_DEMO_TRON_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';

const EVM_CHAINS = new Set(['base', 'bnb', 'ethereum', 'polygon', 'arbitrum']);
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SOL_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRON_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const EVM_TXHASH_RE = /^0x[a-fA-F0-9]{64}$/;
const SOL_TXHASH_RE = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;
const TRON_TXHASH_RE = /^(?:0x)?[a-fA-F0-9]{64}$/;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export const PAYMENT_PRODUCTS = Object.freeze({
  'shop-pro-pass': {
    id: 'shop-pro-pass',
    shopItemId: 'pro-pass-monthly',
    name: '像素鎮 Pro 通行證（月）',
    priceUsd: 9,
    stream: 'pro_skin',
    type: 'pro',
    requiresProject: false,
    customAmount: false,
  },
  'shop-genesis-pack': {
    id: 'shop-genesis-pack',
    shopItemId: 'founder-skin-bundle',
    name: '創世限定外觀大禮包',
    priceUsd: 15,
    stream: 'pro_skin',
    type: 'skin_bundle',
    unlockSkins: ['skin-cyber', 'skin-cat', 'skin-gold'],
    requiresProject: false,
    customAmount: false,
  },
  'billboard-ad': {
    id: 'billboard-ad',
    shopItemId: null,
    name: '像素廣場霓虹廣告位（7天）',
    priceUsd: 29,
    stream: 'billboard_ad',
    type: 'billboard',
    requiresProject: true,
    customAmount: false,
  },
  'bounty-topup': {
    id: 'bounty-topup',
    shopItemId: null,
    name: '項目懸賞池美金充值',
    priceUsd: 10,
    minUsd: 5,
    maxUsd: 5000,
    stream: 'bounty_fee',
    type: 'bounty_topup',
    requiresProject: true,
    customAmount: true,
  },
});

const PRODUCT_ALIASES = Object.freeze({
  'pro-pass-monthly': 'shop-pro-pass',
  'founder-skin-bundle': 'shop-genesis-pack',
  'billboard': 'billboard-ad',
});

const REWARD_TYPE_PREFIX = Object.freeze({
  pro: 'PRO',
  genesis_pack: 'PACK',
  gold_500: 'GOLD',
  billboard: 'AD',
});

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

function sanitizeText(value, maxLen = 120) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F-\u009F\r\n\t]+/g, ' ').trim().slice(0, maxLen);
}

export function resolvePaymentProduct(rawId) {
  if (!rawId || typeof rawId !== 'string') return null;
  const normalized = PRODUCT_ALIASES[rawId.trim()] || rawId.trim();
  return PAYMENT_PRODUCTS[normalized] || null;
}

export function getTreasuryAddress(chain) {
  if (chain === 'solana') {
    const envAddr = (process.env.TREASURY_SOL_ADDRESS || '').trim();
    return {
      address: envAddr || DEFAULT_DEMO_SOL_ADDRESS,
      isDemoAddress: !envAddr,
    };
  }
  if (chain === 'tron') {
    const envAddr = (process.env.TREASURY_TRON_ADDRESS || '').trim();
    return {
      address: envAddr || DEFAULT_DEMO_TRON_ADDRESS,
      isDemoAddress: !envAddr,
    };
  }
  const envAddr = (process.env.TREASURY_EVM_ADDRESS || '').trim();
  return {
    address: envAddr || DEFAULT_DEMO_EVM_ADDRESS,
    isDemoAddress: !envAddr,
  };
}

export function isPolarEnabled() {
  return Boolean((process.env.POLAR_CHECKOUT_URL || '').trim());
}

export function isStripeEnabled() {
  return Boolean((process.env.STRIPE_SECRET_KEY || '').trim() && (process.env.STRIPE_CHECKOUT_URL || '').trim());
}

export function getPaymentConfig() {
  return {
    polarEnabled: isPolarEnabled(),
    stripeEnabled: isStripeEnabled(),
    stablecoinChains: [...STABLECOIN_CHAINS],
    stablecoinTokens: [...STABLECOIN_TOKENS],
    minPayoutUsd: MIN_PAYOUT_USD,
    treasuryEvmAddress: getTreasuryAddress('base').address,
    treasurySolAddress: getTreasuryAddress('solana').address,
    treasuryTronAddress: getTreasuryAddress('tron').address,
    products: Object.values(PAYMENT_PRODUCTS),
  };
}

export function validateWalletAddress(chain, address) {
  if (typeof address !== 'string') return false;
  const trimmed = address.trim();
  if (chain === 'solana') return SOL_ADDRESS_RE.test(trimmed);
  if (chain === 'tron') return TRON_ADDRESS_RE.test(trimmed);
  if (EVM_CHAINS.has(chain)) {
    return EVM_ADDRESS_RE.test(trimmed);
  }
  return false;
}

export function validateTxHash(chain, txHash) {
  if (typeof txHash !== 'string') return false;
  const trimmed = txHash.trim();
  if (chain === 'solana') return SOL_TXHASH_RE.test(trimmed);
  if (chain === 'tron') return TRON_TXHASH_RE.test(trimmed);
  return EVM_TXHASH_RE.test(trimmed);
}

export function generateSandboxTxHash(chain) {
  if (chain === 'solana') {
    const bytes = crypto.randomBytes(64);
    let out = '';
    for (let i = 0; i < 64; i += 1) {
      out += BASE58_ALPHABET[bytes[i] % BASE58_ALPHABET.length];
    }
    return out;
  }
  if (chain === 'tron') {
    return crypto.randomBytes(32).toString('hex');
  }
  return `0x${crypto.randomBytes(32).toString('hex')}`;
}

function generateRandomCodeSegment(length = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function addRevenue(state, { stream, label, amountUsd, projectId = null, taskId = null }) {
  const amt = round2(amountUsd);
  if (amt <= 0) return;

  if (stream === 'bounty_fee') {
    state.founderRevenue.bountyFeesUsd = round2((state.founderRevenue.bountyFeesUsd || 0) + amt);
  } else if (stream === 'incubation_carry') {
    state.founderRevenue.incubationCarryUsd = round2((state.founderRevenue.incubationCarryUsd || 0) + amt);
  } else if (stream === 'billboard_ad') {
    state.founderRevenue.billboardAdsUsd = round2((state.founderRevenue.billboardAdsUsd || 0) + amt);
  } else if (stream === 'pro_skin') {
    state.founderRevenue.proSkinsUsd = round2((state.founderRevenue.proSkinsUsd || 0) + amt);
  }

  state.founderRevenue.totalUsd = round2(
    (state.founderRevenue.bountyFeesUsd || 0)
    + (state.founderRevenue.incubationCarryUsd || 0)
    + (state.founderRevenue.billboardAdsUsd || 0)
    + (state.founderRevenue.proSkinsUsd || 0),
  );

  state.founderRevenue.history.unshift({
    id: uid('rev'),
    timestamp: new Date().toISOString(),
    stream,
    label,
    amountUsd: amt,
    projectId,
    taskId,
  });
  if (state.founderRevenue.history.length > 80) {
    state.founderRevenue.history.length = 80;
  }
}

function pushFeed(state, entry) {
  state.activityFeed.unshift({
    id: uid('act'),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (state.activityFeed.length > 60) {
    state.activityFeed.length = 60;
  }
}

function fulfillProductForUser(state, user, { product, amountUsd, targetProjectId, billboardText, channelLabel }) {
  const now = new Date().toISOString();
  let summary = '';

  if (product.type === 'pro') {
    user.isPro = true;
    if (!user.ownedItems.includes('pro-pass-monthly')) {
      user.ownedItems.push('pro-pass-monthly');
    }
    addRevenue(state, {
      stream: 'pro_skin',
      label: `${user.displayName} 透過 ${channelLabel} 開通「${product.name}」`,
      amountUsd: amountUsd || product.priceUsd,
    });
    syncUserLeaderboard(state, user);
    summary = '已開通像素鎮 Pro 通行證！';
    pushFeed(state, {
      type: 'payment',
      icon: '💎',
      message: `${user.displayName} 透過 ${channelLabel} 開通了 Pro 會員（+$${round2(amountUsd || product.priceUsd)} USD）`,
    });
  } else if (product.type === 'skin_bundle') {
    for (const sid of product.unlockSkins || []) {
      if (!user.ownedSkins.includes(sid)) {
        user.ownedSkins.push(sid);
      }
    }
    if (!user.ownedItems.includes('founder-skin-bundle')) {
      user.ownedItems.push('founder-skin-bundle');
    }
    addRevenue(state, {
      stream: 'pro_skin',
      label: `${user.displayName} 透過 ${channelLabel} 購買「${product.name}」`,
      amountUsd: amountUsd || product.priceUsd,
    });
    summary = '已解鎖全部 3 款創世限定像素皮膚！';
    pushFeed(state, {
      type: 'payment',
      icon: '🎁',
      message: `${user.displayName} 透過 ${channelLabel} 解鎖創世限定外觀大禮包（+$${round2(amountUsd || product.priceUsd)} USD）`,
    });
  } else if (product.type === 'billboard') {
    const proj = state.projects.find((p) => p.id === targetProjectId) || state.projects[0];
    if (proj) {
      proj.sponsoredBillboard = true;
      proj.billboardText = sanitizeText(billboardText, 64)
        || `🔥 ${proj.shortName || proj.name} 像素廣場霓虹精選！`;
      proj.billboardUpdatedAt = now;
      addRevenue(state, {
        stream: 'billboard_ad',
        label: `《${proj.shortName || proj.name}》透過 ${channelLabel} 租用霓虹廣告位`,
        amountUsd: amountUsd || product.priceUsd,
        projectId: proj.id,
      });
      summary = `已為《${proj.shortName || proj.name}》點亮像素廣場霓虹廣告位！`;
      pushFeed(state, {
        type: 'billboard',
        icon: '📺',
        message: `${user.displayName} 透過 ${channelLabel} 為《${proj.shortName}》點亮霓虹廣告位（+$${round2(amountUsd || product.priceUsd)}）`,
        projectId: proj.id,
      });
    }
  } else if (product.type === 'bounty_topup') {
    const proj = state.projects.find((p) => p.id === targetProjectId) || state.projects[0];
    const gross = round2(amountUsd || product.priceUsd);
    const fee = round2(gross * (PLATFORM_BOUNTY_FEE_PCT / 100));
    const netPool = round2(gross - fee);
    if (proj) {
      proj.bountyPoolUsd = round2((proj.bountyPoolUsd || 0) + netPool);
      addRevenue(state, {
        stream: 'bounty_fee',
        label: `《${proj.shortName || proj.name}》懸賞池充值 $${gross}（10% 託管費）`,
        amountUsd: fee,
        projectId: proj.id,
      });
      summary = `已為《${proj.shortName || proj.name}》懸賞池注資 +$${netPool}（託管費 $${fee}）！`;
      pushFeed(state, {
        type: 'payment',
        icon: '💰',
        message: `${user.displayName} 透過 ${channelLabel} 為《${proj.shortName}》充值 $${gross} 懸賞池！`,
        projectId: proj.id,
      });
    }
  }

  return summary;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function verifyHmacHex(rawBody, secret, providedHex) {
  if (!secret || !providedHex) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(providedHex.replace(/^sha256=/i, '').trim(), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseStripeSignatureHeader(header) {
  if (!header || typeof header !== 'string') return { timestamp: '', v1: '' };
  const parts = header.split(',');
  let timestamp = '';
  let v1 = '';
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k?.trim() === 't') timestamp = (v || '').trim();
    if (k?.trim() === 'v1') v1 = (v || '').trim();
  }
  return { timestamp, v1 };
}

export async function handleStablecoinCreate(req, res, body, store, sseHub) {
  const product = resolvePaymentProduct(body?.productId);
  if (!product) {
    return sendJson(res, 400, { ok: false, error: `不支援的商品代碼：${body?.productId}` });
  }

  const chain = String(body?.chain || 'base').toLowerCase();
  if (!STABLECOIN_CHAINS.includes(chain)) {
    return sendJson(res, 400, { ok: false, error: `不支援的區塊鏈網路：${chain}（支援：${STABLECOIN_CHAINS.join(', ')}）` });
  }

  const token = String(body?.token || 'USDC').toUpperCase();
  if (!STABLECOIN_TOKENS.includes(token)) {
    return sendJson(res, 400, { ok: false, error: `不支援的穩定幣幣種：${token}（僅支援 USDC / USDT）` });
  }

  let amountUsd = product.priceUsd;
  if (product.customAmount) {
    const custom = round2(Number(body?.customAmountUsd));
    if (!Number.isFinite(custom) || custom < (product.minUsd || 5) || custom > (product.maxUsd || 5000)) {
      return sendJson(res, 400, { ok: false, error: `自訂充值金額需介於 $${product.minUsd || 5} 至 $${product.maxUsd || 5000} USD` });
    }
    amountUsd = custom;
  }

  const treasury = getTreasuryAddress(chain);
  let validationError = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    let targetProjectId = body?.targetProjectId || null;
    if (product.requiresProject) {
      const proj = targetProjectId
        ? s.projects.find((p) => p.id === targetProjectId)
        : null;
      if (!proj) {
        validationError = '此商品必須指定有效的 targetProjectId';
        return null;
      }
      targetProjectId = proj.id;
    }

    const nowMs = Date.now();
    const order = {
      id: uid('ord'),
      method: 'stablecoin',
      provider: `stablecoin_${chain}`,
      userId: ctx.userId,
      userName: ctx.user.displayName,
      productId: product.id,
      productName: product.name,
      targetProjectId,
      billboardText: sanitizeText(body?.billboardText, 64),
      amountUsd,
      chain,
      token,
      receiverAddress: treasury.address,
      isDemoAddress: treasury.isDemoAddress,
      memoCode: `PCT-${generateRandomCodeSegment(6)}`,
      status: 'pending',
      txHash: null,
      sandboxSimulated: false,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + 30 * 60_000).toISOString(),
      confirmedAt: null,
    };

    s.paymentOrders.unshift(order);
    if (s.paymentOrders.length > 200) s.paymentOrders.length = 200;
    return { order, userId: ctx.userId };
  });

  if (validationError || !result) {
    return sendJson(res, 400, { ok: false, error: validationError || '建立穩定幣訂單失敗' });
  }

  sseHub?.broadcast('payment_order_created', { order: result.order });
  return sendJson(res, 201, {
    ok: true,
    order: result.order,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleStablecoinConfirm(req, res, body, store, sseHub) {
  const orderId = sanitizeText(body?.orderId, 64);
  if (!orderId) {
    return sendJson(res, 400, { ok: false, error: '請提供 orderId' });
  }

  const simulate = Boolean(body?.simulate);
  let errStatus = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    const order = s.paymentOrders.find((o) => o.id === orderId);
    if (!order) {
      errStatus = 404;
      errMessage = `找不到支付訂單：${orderId}`;
      return null;
    }
    if (order.status === 'confirmed') {
      errStatus = 409;
      errMessage = '此訂單已經確認並開通完成';
      return null;
    }

    const txHash = simulate
      ? generateSandboxTxHash(order.chain)
      : sanitizeText(body?.txHash, 120);

    if (!validateTxHash(order.chain, txHash)) {
      errStatus = 400;
      errMessage = order.chain === 'solana'
        ? '無效的 Solana 交易簽名格式（需為 32–88 位 Base58 字元）'
        : '無效的 EVM TxHash 格式（需為 0x 開頭的 64 位十六進位字串）';
      return null;
    }

    const duplicate = s.paymentOrders.find(
      (o) => o.id !== order.id && o.status === 'confirmed' && o.txHash && o.txHash.toLowerCase() === txHash.toLowerCase(),
    );
    if (duplicate) {
      errStatus = 409;
      errMessage = '此交易雜湊 (TxHash) 已被其他訂單使用，無法重複入帳';
      return null;
    }

    const product = resolvePaymentProduct(order.productId);
    const targetUser = s.users[order.userId] || ctx.user;

    order.txHash = txHash;
    order.sandboxSimulated = simulate;
    order.status = 'confirmed';
    order.confirmedAt = new Date().toISOString();

    const rewardSummary = fulfillProductForUser(s, targetUser, {
      product,
      amountUsd: order.amountUsd,
      targetProjectId: order.targetProjectId,
      billboardText: order.billboardText,
      channelLabel: `${order.token} (${order.chain.toUpperCase()}${simulate ? ' 沙盒' : ''})`,
    });

    return { order, rewardSummary, userId: ctx.userId };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, error: errMessage });
  }

  sseHub?.broadcast('payment_confirmed', { order: result.order });
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 200, {
    ok: true,
    order: result.order,
    rewardSummary: result.rewardSummary,
    founderRevenue: state.founderRevenue,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleWalletBind(req, res, body, store, sseHub) {
  const chain = String(body?.chain || '').toLowerCase();
  const address = sanitizeText(body?.address, 80);

  if (!STABLECOIN_CHAINS.includes(chain)) {
    return sendJson(res, 400, { ok: false, error: `不支援的提領區塊鏈：${chain}（支援：${STABLECOIN_CHAINS.join(', ')}）` });
  }
  if (!validateWalletAddress(chain, address)) {
    return sendJson(res, 400, {
      ok: false,
      error: chain === 'solana'
        ? '無效的 Solana 錢包地址格式（需為 32–44 位 Base58 地址）'
        : '無效的 EVM 錢包地址格式（需為 0x 開頭的 40 位十六進位地址）',
    });
  }

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    ctx.user.walletChain = chain;
    ctx.user.walletAddress = address;
    pushFeed(s, {
      type: 'wallet',
      icon: '🔗',
      message: `${ctx.user.displayName} 綁定了 ${chain.toUpperCase()} 穩定幣收款錢包`,
    });
    return { userId: ctx.userId, wallet: { chain, address } };
  });

  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 200, {
    ok: true,
    wallet: result.wallet,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handlePayoutRequest(req, res, body, store, sseHub) {
  const amountUsd = round2(Number(body?.amountUsd));
  if (!Number.isFinite(amountUsd) || amountUsd < MIN_PAYOUT_USD) {
    return sendJson(res, 400, { ok: false, error: `穩定幣提領最低門檻為 $${MIN_PAYOUT_USD} USD` });
  }

  const token = String(body?.token || 'USDC').toUpperCase();
  if (!STABLECOIN_TOKENS.includes(token)) {
    return sendJson(res, 400, { ok: false, error: `不支援的提領穩定幣：${token}` });
  }

  const simulateInstant = Boolean(body?.simulateInstant);
  let errMsg = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    const user = ctx.user;

    const chain = String(body?.chain || user.walletChain || '').toLowerCase();
    const address = user.walletAddress || '';

    if (!address || !STABLECOIN_CHAINS.includes(chain)) {
      errMsg = '請先綁定有效的穩定幣收款錢包地址後再申請提領';
      return null;
    }
    if (amountUsd > round2(user.usdBalance || 0)) {
      errMsg = `可提領餘額不足（目前餘額 $${round2(user.usdBalance || 0)}，申請提領 $${amountUsd}）`;
      return null;
    }

    user.usdBalance = round2((user.usdBalance || 0) - amountUsd);
    const now = new Date().toISOString();
    const payout = {
      id: uid('pay'),
      userId: user.id,
      userName: user.displayName,
      amountUsd,
      chain,
      token,
      address,
      status: simulateInstant ? 'paid' : 'pending',
      txHash: simulateInstant ? generateSandboxTxHash(chain) : null,
      sandboxSimulated: simulateInstant,
      createdAt: now,
      paidAt: simulateInstant ? now : null,
    };

    s.payouts.unshift(payout);
    if (s.payouts.length > 200) s.payouts.length = 200;

    pushFeed(s, {
      type: 'payout',
      icon: '💸',
      message: `${user.displayName} 申請穩定幣提領 $${amountUsd} ${token} (${chain.toUpperCase()})${simulateInstant ? ' — 沙盒即時到帳！' : '（等待鎮長打款）'}`,
    });

    return { payout, userId: user.id };
  });

  if (errMsg || !result) {
    return sendJson(res, 400, { ok: false, error: errMsg || '提領申請失敗' });
  }

  sseHub?.broadcast('payout_requested', { payout: result.payout });
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 201, {
    ok: true,
    payout: result.payout,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleAdminMarkPayoutPaid(req, res, payoutId, body, store, sseHub) {
  let errStatus = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (ctx.user.role !== 'founder') {
      errStatus = 403;
      errMessage = '僅限創始鎮長執行打款確認操作';
      return null;
    }

    const payout = s.payouts.find((p) => p.id === payoutId);
    if (!payout) {
      errStatus = 404;
      errMessage = `找不到提領單：${payoutId}`;
      return null;
    }
    if (payout.status === 'paid') {
      errStatus = 409;
      errMessage = '此提領單已標記為發放完成';
      return null;
    }

    const simulate = Boolean(body?.simulate);
    const txHash = simulate
      ? generateSandboxTxHash(payout.chain)
      : sanitizeText(body?.txHash, 120);

    if (!validateTxHash(payout.chain, txHash)) {
      errStatus = 400;
      errMessage = payout.chain === 'solana'
        ? '請提供有效的 Solana TxHash（32–88 位 Base58）或傳入 simulate: true'
        : '請提供有效的 EVM TxHash（0x + 64 位十六進位）或傳入 simulate: true';
      return null;
    }

    payout.status = 'paid';
    payout.txHash = txHash;
    payout.sandboxSimulated = simulate;
    payout.paidAt = new Date().toISOString();

    pushFeed(s, {
      type: 'payout',
      icon: '✅',
      message: `鎮長已完成穩定幣打款：${payout.userName} 實收 $${payout.amountUsd} ${payout.token} (${payout.chain.toUpperCase()})`,
    });

    return { payout, userId: ctx.userId };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, error: errMessage });
  }

  sseHub?.broadcast('payout_paid', { payout: result.payout });
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 200, {
    ok: true,
    payout: result.payout,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleFiatCheckout(req, res, body, store, sseHub) {
  const product = resolvePaymentProduct(body?.productId);
  if (!product) {
    return sendJson(res, 400, { ok: false, error: `不支援的商品代碼：${body?.productId}` });
  }

  const provider = String(body?.provider || 'polar').toLowerCase();
  if (provider !== 'polar' && provider !== 'stripe') {
    return sendJson(res, 400, { ok: false, error: `不支援的法幣收款通道：${provider}（支援 polar / stripe）` });
  }

  let amountUsd = product.priceUsd;
  if (product.customAmount) {
    const custom = round2(Number(body?.customAmountUsd));
    if (!Number.isFinite(custom) || custom < (product.minUsd || 5) || custom > (product.maxUsd || 5000)) {
      return sendJson(res, 400, { ok: false, error: `自訂充值金額需介於 $${product.minUsd || 5} 至 $${product.maxUsd || 5000} USD` });
    }
    amountUsd = custom;
  }

  let validationError = null;
  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    let targetProjectId = body?.targetProjectId || null;
    if (product.requiresProject) {
      const proj = targetProjectId ? s.projects.find((p) => p.id === targetProjectId) : null;
      if (!proj) {
        validationError = '此商品必須指定有效的 targetProjectId';
        return null;
      }
      targetProjectId = proj.id;
    }

    const nowMs = Date.now();
    const order = {
      id: uid('ord'),
      method: 'fiat',
      provider,
      userId: ctx.userId,
      userName: ctx.user.displayName,
      productId: product.id,
      productName: product.name,
      targetProjectId,
      billboardText: sanitizeText(body?.billboardText, 64),
      amountUsd,
      chain: null,
      token: 'USD',
      receiverAddress: null,
      memoCode: `FIAT-${generateRandomCodeSegment(6)}`,
      status: 'pending',
      txHash: null,
      sandboxSimulated: false,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + 30 * 60_000).toISOString(),
      confirmedAt: null,
    };

    s.paymentOrders.unshift(order);
    if (s.paymentOrders.length > 200) s.paymentOrders.length = 200;
    return { order, userId: ctx.userId };
  });

  if (validationError || !result) {
    return sendJson(res, 400, { ok: false, error: validationError || '建立法幣結帳單失敗' });
  }

  let checkoutUrl = null;
  let sandboxMode = true;
  if (provider === 'polar' && isPolarEnabled()) {
    const base = process.env.POLAR_CHECKOUT_URL.trim();
    const sep = base.includes('?') ? '&' : '?';
    checkoutUrl = `${base}${sep}metadata[orderId]=${encodeURIComponent(result.order.id)}&metadata[productId]=${encodeURIComponent(product.id)}`;
    sandboxMode = false;
  } else if (provider === 'stripe' && isStripeEnabled()) {
    const base = process.env.STRIPE_CHECKOUT_URL.trim();
    const sep = base.includes('?') ? '&' : '?';
    checkoutUrl = `${base}${sep}client_reference_id=${encodeURIComponent(result.order.id)}`;
    sandboxMode = false;
  }

  sseHub?.broadcast('payment_order_created', { order: result.order });
  return sendJson(res, 201, {
    ok: true,
    provider,
    sandboxMode,
    checkoutUrl,
    order: result.order,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleSandboxComplete(req, res, body, store, sseHub) {
  const orderId = sanitizeText(body?.orderId, 64);
  if (!orderId) {
    return sendJson(res, 400, { ok: false, error: '請提供 orderId' });
  }

  let errStatus = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    const order = s.paymentOrders.find((o) => o.id === orderId);
    if (!order) {
      errStatus = 404;
      errMessage = `找不到結帳訂單：${orderId}`;
      return null;
    }
    if (order.status === 'confirmed') {
      errStatus = 409;
      errMessage = '此訂單已經完成結帳';
      return null;
    }

    const product = resolvePaymentProduct(order.productId);
    const targetUser = s.users[order.userId] || ctx.user;

    order.status = 'confirmed';
    order.sandboxSimulated = true;
    order.txHash = `sandbox-${order.provider}-${crypto.randomBytes(6).toString('hex')}`;
    order.confirmedAt = new Date().toISOString();

    const rewardSummary = fulfillProductForUser(s, targetUser, {
      product,
      amountUsd: order.amountUsd,
      targetProjectId: order.targetProjectId,
      billboardText: order.billboardText,
      channelLabel: `${String(order.provider || 'fiat').toUpperCase()} 沙盒結帳`,
    });

    return { order, rewardSummary, userId: ctx.userId };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, error: errMessage });
  }

  sseHub?.broadcast('payment_confirmed', { order: result.order });
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 200, {
    ok: true,
    order: result.order,
    rewardSummary: result.rewardSummary,
    founderRevenue: state.founderRevenue,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handlePaymentWebhook(req, res, provider, rawBody, store, sseHub) {
  const secret = provider === 'stripe'
    ? (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
    : (process.env.POLAR_WEBHOOK_SECRET || '').trim();

  if (secret) {
    let valid = false;
    if (provider === 'stripe') {
      const { timestamp, v1 } = parseStripeSignatureHeader(req.headers['stripe-signature']);
      if (timestamp && v1) {
        valid = verifyHmacHex(`${timestamp}.${rawBody}`, secret, v1);
      }
    } else {
      const sig = req.headers['webhook-signature'] || req.headers['x-polar-signature'] || '';
      valid = verifyHmacHex(rawBody, secret, String(sig));
    }
    if (!valid) {
      return sendJson(res, 401, { ok: false, error: `${provider} Webhook HMAC 簽名驗證失敗` });
    }
  }

  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return sendJson(res, 400, { ok: false, error: '無效的 Webhook JSON 負載' });
  }

  const orderId = payload?.orderId
    || payload?.data?.metadata?.orderId
    || payload?.data?.object?.client_reference_id
    || payload?.data?.object?.metadata?.orderId
    || null;

  let fulfilledOrderId = null;

  if (orderId) {
    const { state } = await store.mutate((s) => {
      ensureStateSchema(s);
      const order = s.paymentOrders.find((o) => o.id === orderId);
      if (!order || order.status === 'confirmed') return;
      const product = resolvePaymentProduct(order.productId);
      const targetUser = s.users[order.userId] || s.users['founder-demo'];
      if (!product || !targetUser) return;

      order.status = 'confirmed';
      order.confirmedAt = new Date().toISOString();
      order.txHash = payload?.id || `wh-${provider}-${crypto.randomBytes(6).toString('hex')}`;
      fulfillProductForUser(s, targetUser, {
        product,
        amountUsd: order.amountUsd,
        targetProjectId: order.targetProjectId,
        billboardText: order.billboardText,
        channelLabel: `${provider.toUpperCase()} Webhook`,
      });
      fulfilledOrderId = order.id;
    });

    if (fulfilledOrderId) {
      sseHub?.broadcast('payment_confirmed', { orderId: fulfilledOrderId, provider });
      sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
    }
  }

  return sendJson(res, 200, {
    ok: true,
    provider,
    verified: Boolean(secret),
    received: true,
    fulfilledOrderId,
  });
}

export async function handleRedeemCode(req, res, body, store, sseHub) {
  const rawCode = sanitizeText(body?.code, 48).toUpperCase();
  if (!rawCode) {
    return sendJson(res, 400, { ok: false, error: '請輸入兌換碼' });
  }

  let errStatus = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    const user = ctx.user;
    const entry = s.redeemCodes.find((c) => c.code.toUpperCase() === rawCode);

    if (!entry) {
      errStatus = 404;
      errMessage = `無效的兌換碼：${rawCode}`;
      return null;
    }
    if (entry.used) {
      errStatus = 409;
      errMessage = `兌換碼 ${entry.code} 已經被使用過了`;
      return null;
    }

    entry.used = true;
    entry.usedBy = user.id;
    entry.usedByName = user.displayName;
    entry.usedAt = new Date().toISOString();

    let rewardSummary = '';
    if (entry.rewardType === 'pro') {
      rewardSummary = fulfillProductForUser(s, user, {
        product: PAYMENT_PRODUCTS['shop-pro-pass'],
        amountUsd: PAYMENT_PRODUCTS['shop-pro-pass'].priceUsd,
        channelLabel: `兌換碼 (${entry.code})`,
      });
    } else if (entry.rewardType === 'genesis_pack') {
      rewardSummary = fulfillProductForUser(s, user, {
        product: PAYMENT_PRODUCTS['shop-genesis-pack'],
        amountUsd: PAYMENT_PRODUCTS['shop-genesis-pack'].priceUsd,
        channelLabel: `兌換碼 (${entry.code})`,
      });
    } else if (entry.rewardType === 'billboard') {
      rewardSummary = fulfillProductForUser(s, user, {
        product: PAYMENT_PRODUCTS['billboard-ad'],
        amountUsd: PAYMENT_PRODUCTS['billboard-ad'].priceUsd,
        targetProjectId: body?.targetProjectId || s.projects[0]?.id,
        billboardText: body?.billboardText,
        channelLabel: `兌換碼 (${entry.code})`,
      });
    } else if (entry.rewardType === 'gold_500') {
      user.gold = Number(user.gold || 0) + 500;
      rewardSummary = '成功兌換 +500G 像素金幣！';
      pushFeed(s, {
        type: 'redeem',
        icon: '🎟️',
        message: `${user.displayName} 使用兌換碼 ${entry.code} 領取了 +500G 金幣！`,
      });
    }

    return {
      code: entry.code,
      rewardType: entry.rewardType,
      rewardSummary,
      userId: user.id,
    };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, error: errMessage });
  }

  sseHub?.broadcast('code_redeemed', { code: result.code, rewardType: result.rewardType });
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 200, {
    ok: true,
    code: result.code,
    rewardType: result.rewardType,
    rewardSummary: result.rewardSummary,
    founderRevenue: state.founderRevenue,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleAdminGenerateCodes(req, res, body, store, sseHub) {
  const rewardType = sanitizeText(body?.rewardType || 'pro', 32);
  if (!REWARD_TYPE_PREFIX[rewardType]) {
    return sendJson(res, 400, {
      ok: false,
      error: `不支援的兌換碼獎勵類型：${rewardType}（支援：pro, genesis_pack, gold_500, billboard）`,
    });
  }

  const count = Math.max(1, Math.min(20, Math.round(Number(body?.count) || 1)));
  const note = sanitizeText(body?.note, 80) || `鎮長生成 (${rewardType})`;

  let errStatus = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (ctx.user.role !== 'founder') {
      errStatus = 403;
      errMessage = '僅限創始鎮長生成兌換碼';
      return null;
    }

    const prefix = REWARD_TYPE_PREFIX[rewardType];
    const existing = new Set(s.redeemCodes.map((c) => c.code.toUpperCase()));
    const created = [];
    const now = new Date().toISOString();

    for (let i = 0; i < count; i += 1) {
      let code = `PIXEL-${prefix}-${generateRandomCodeSegment(4)}`;
      while (existing.has(code)) {
        code = `PIXEL-${prefix}-${generateRandomCodeSegment(4)}`;
      }
      existing.add(code);
      const item = {
        code,
        rewardType,
        note,
        used: false,
        usedBy: null,
        usedByName: null,
        usedAt: null,
        createdAt: now,
      };
      s.redeemCodes.unshift(item);
      created.push(item);
    }

    return { codes: created, userId: ctx.userId };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, error: errMessage });
  }

  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 201, {
    ok: true,
    codes: result.codes,
    redeemCodes: state.redeemCodes,
    state: projectStateForUser(state, result.userId),
  });
}
