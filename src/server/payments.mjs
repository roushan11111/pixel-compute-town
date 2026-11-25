// PixelCompute Town — Three-in-One Payment Engine (Stablecoin USDC/USDT + Fiat Polar/Stripe + Redeem Codes) & Stablecoin Payouts

import crypto from 'node:crypto';
import { ensureStateSchema, PLATFORM_BOUNTY_FEE_PCT, round2 } from './seed.mjs';
import { getActiveUserContext, isFounderAdmin, projectStateForUser, syncUserLeaderboard } from './auth.mjs';

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

export const DEMO_REDEEM_CODES = new Set(['PIXEL-PRO-2026', 'PIXEL-PACK-2026', 'PIXEL-GOLD-500']);

const POLAR_PRODUCT_ENV_MAP = Object.freeze({
  'shop-pro-pass': 'POLAR_PRO_CHECKOUT_URL',
  'shop-genesis-pack': 'POLAR_GENESIS_CHECKOUT_URL',
  'billboard-ad': 'POLAR_BILLBOARD_CHECKOUT_URL',
  'bounty-topup': 'POLAR_BOUNTY_CHECKOUT_URL',
});

const STRIPE_PRODUCT_ENV_MAP = Object.freeze({
  'shop-pro-pass': 'STRIPE_PRO_CHECKOUT_URL',
  'shop-genesis-pack': 'STRIPE_GENESIS_CHECKOUT_URL',
  'billboard-ad': 'STRIPE_BILLBOARD_CHECKOUT_URL',
  'bounty-topup': 'STRIPE_BOUNTY_CHECKOUT_URL',
});

export function getPolarCheckoutUrl(productId = null) {
  const envKey = productId ? POLAR_PRODUCT_ENV_MAP[productId] : null;
  const specific = envKey ? (process.env[envKey] || '').trim() : '';
  return specific || (process.env.POLAR_CHECKOUT_URL || '').trim();
}

export function getStripeCheckoutUrl(productId = null) {
  const envKey = productId ? STRIPE_PRODUCT_ENV_MAP[productId] : null;
  const specific = envKey ? (process.env[envKey] || '').trim() : '';
  return specific || (process.env.STRIPE_CHECKOUT_URL || '').trim();
}

export function isPolarEnabled() {
  if ((process.env.POLAR_CHECKOUT_URL || '').trim()) return true;
  return Object.values(POLAR_PRODUCT_ENV_MAP).some((k) => Boolean((process.env[k] || '').trim()));
}

export function isStripeEnabled() {
  if ((process.env.STRIPE_CHECKOUT_URL || '').trim()) return true;
  return Object.values(STRIPE_PRODUCT_ENV_MAP).some((k) => Boolean((process.env[k] || '').trim()));
}

export function getAfdianStoreUrl(productId = null) {
  const map = {
    'shop-pro-pass': 'AFDIAN_PRO_URL',
    'shop-genesis-pack': 'AFDIAN_GENESIS_URL',
    'billboard-ad': 'AFDIAN_BILLBOARD_URL',
    'bounty-topup': 'AFDIAN_BOUNTY_URL',
  };
  const specificKey = productId ? map[productId] : null;
  const specific = specificKey ? (process.env[specificKey] || '').trim() : '';
  return specific || (process.env.AFDIAN_STORE_URL || process.env.REDEEM_STORE_URL || '').trim();
}

export function getPaymentConfig() {
  const afdianStoreUrl = getAfdianStoreUrl();
  return {
    polarEnabled: isPolarEnabled(),
    stripeEnabled: isStripeEnabled(),
    afdianEnabled: Boolean(afdianStoreUrl),
    redeemStoreUrl: afdianStoreUrl,
    afdianUrls: {
      default: afdianStoreUrl,
      'shop-pro-pass': getAfdianStoreUrl('shop-pro-pass'),
      'shop-genesis-pack': getAfdianStoreUrl('shop-genesis-pack'),
      'billboard-ad': getAfdianStoreUrl('billboard-ad'),
      'bounty-topup': getAfdianStoreUrl('bounty-topup'),
    },
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
  let errCode = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (s.settings?.liveProductionMode && simulate && !isFounderAdmin(req, ctx)) {
      errStatus = 403;
      errCode = 'LIVE_MODE_LOCKED';
      errMessage = '正式營運模式已停用沙盒模擬上鏈，請填寫真實鏈上 TxHash';
      return null;
    }
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
    return sendJson(res, errStatus, { ok: false, ...(errCode ? { code: errCode } : {}), error: errMessage });
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
  let errStatus = 400;
  let errCode = null;
  let errMsg = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (s.settings?.liveProductionMode && simulateInstant && !isFounderAdmin(req, ctx)) {
      errStatus = 403;
      errCode = 'LIVE_MODE_LOCKED';
      errMsg = '正式營運模式已停用沙盒即時出款，所有提領均由鎮長批次打帳發放';
      return null;
    }
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
    return sendJson(res, errStatus || 400, { ok: false, ...(errCode ? { code: errCode } : {}), error: errMsg || '提領申請失敗' });
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
  let errCode = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (!isFounderAdmin(req, ctx)) {
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
    return sendJson(res, errStatus, { ok: false, ...(errCode ? { code: errCode } : {}), error: errMessage });
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
  if (provider === 'polar') {
    const base = getPolarCheckoutUrl(product.id);
    if (base) {
      const sep = base.includes('?') ? '&' : '?';
      checkoutUrl = `${base}${sep}metadata[orderId]=${encodeURIComponent(result.order.id)}&metadata[productId]=${encodeURIComponent(product.id)}`;
      sandboxMode = false;
    }
  } else if (provider === 'stripe') {
    const base = getStripeCheckoutUrl(product.id);
    if (base) {
      const sep = base.includes('?') ? '&' : '?';
      checkoutUrl = `${base}${sep}client_reference_id=${encodeURIComponent(result.order.id)}`;
      sandboxMode = false;
    }
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
  let errCode = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (s.settings?.liveProductionMode && !isFounderAdmin(req, ctx)) {
      errStatus = 403;
      errCode = 'LIVE_MODE_LOCKED';
      errMessage = '正式營運模式已停用沙盒刷卡測試，請使用正式結帳或兌換碼';
      return null;
    }
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
    return sendJson(res, errStatus, { ok: false, ...(errCode ? { code: errCode } : {}), error: errMessage });
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
      // Polar.sh uses Standard Webhooks (webhook-id, webhook-timestamp, webhook-signature: "v1,<base64>") or raw HMAC hex
      const sigHeader = String(req.headers['webhook-signature'] || req.headers['x-polar-signature'] || '');
      const whId = String(req.headers['webhook-id'] || '');
      const whTs = String(req.headers['webhook-timestamp'] || '');
      if (whId && whTs && sigHeader.includes('v1,')) {
        const keyMaterial = secret.startsWith('polar_whs_')
          ? Buffer.from(secret.slice('polar_whs_'.length), 'utf8')
          : secret.startsWith('whsec_')
            ? Buffer.from(secret.slice('whsec_'.length), 'base64')
            : Buffer.from(secret, 'utf8');
        const expectedB64 = crypto
          .createHmac('sha256', keyMaterial)
          .update(`${whId}.${whTs}.${rawBody}`, 'utf8')
          .digest('base64');
        const candidates = sigHeader.split(/\s+/).map((part) => part.replace(/^v1,/, '').trim()).filter(Boolean);
        valid = candidates.some((cand) => {
          const a = Buffer.from(cand, 'utf8');
          const b = Buffer.from(expectedB64, 'utf8');
          return a.length === b.length && crypto.timingSafeEqual(a, b);
        });
      }
      if (!valid) {
        valid = verifyHmacHex(rawBody, secret, sigHeader);
      }
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
  let errCode = null;
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
    if (s.settings?.liveProductionMode && (DEMO_REDEEM_CODES.has(rawCode) || entry.disabledByLiveMode)) {
      errStatus = 403;
      errCode = 'DEMO_CODE_DISABLED';
      errMessage = '正式營運模式已自動停用公開測試兌換碼，請使用購買取得之專屬卡密';
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
    return sendJson(res, errStatus, { ok: false, ...(errCode ? { code: errCode } : {}), error: errMessage });
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
  let errCode = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (!isFounderAdmin(req, ctx)) {
      errStatus = 403;
      errCode = 'ADMIN_ONLY';
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
    return sendJson(res, errStatus, { ok: false, ...(errCode ? { code: errCode } : {}), error: errMessage });
  }

  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 201, {
    ok: true,
    codes: result.codes,
    redeemCodes: state.redeemCodes,
    state: projectStateForUser(state, result.userId),
  });
}

// ============================================================================
// Batch Payout Reconciliation & Founder Manual Order Confirmation
// ============================================================================

export async function handleAfdianWebhook(req, res, rawBody, store, sseHub) {
  // Optional shared token check via query ?token=... or header x-afdian-token when AFDIAN_WEBHOOK_TOKEN is set
  const expectedToken = (process.env.AFDIAN_WEBHOOK_TOKEN || '').trim();
  if (expectedToken) {
    let queryToken = '';
    try {
      const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      queryToken = (u.searchParams.get('token') || '').trim();
    } catch {}
    const headerToken = String(req.headers['x-afdian-token'] || '').trim();
    if (queryToken !== expectedToken && headerToken !== expectedToken) {
      return sendJson(res, 401, { ec: 401, em: 'Invalid Afdian webhook token' });
    }
  }

  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return sendJson(res, 400, { ec: 400, em: 'Invalid JSON payload' });
  }

  const afOrder = payload?.data?.order;
  if (!afOrder || typeof afOrder !== 'object') {
    // Afdian webhook ping / connectivity test expects { ec: 200, em: "" }
    return sendJson(res, 200, { ec: 200, em: '', ok: true, ping: true });
  }

  const outTradeNo = sanitizeText(String(afOrder.out_trade_no || ''), 64) || uid('afd');
  const remark = sanitizeText(String(afOrder.remark || ''), 160);
  const planTitle = sanitizeText(String(afOrder.plan_title || afOrder.sku_detail?.[0]?.name || ''), 80);
  const cnyAmount = Number(afOrder.total_amount || afOrder.show_amount || 0);
  const usdEstimate = cnyAmount > 0 ? round2(cnyAmount / 7.2) : 0;

  let fulfilledOrderId = null;
  let recordedOrderId = null;

  const { state } = await store.mutate((s) => {
    ensureStateSchema(s);
    // Idempotency check by out_trade_no
    const existing = (s.paymentOrders || []).find((o) => o.txHash === `afdian:${outTradeNo}`);
    if (existing) {
      recordedOrderId = existing.id;
      return;
    }

    // Determine product from planTitle or remark
    const titleLower = `${planTitle} ${remark}`.toLowerCase();
    let product = PAYMENT_PRODUCTS['shop-pro-pass'];
    if (titleLower.includes('billboard') || titleLower.includes('廣告') || titleLower.includes('广告')) {
      product = PAYMENT_PRODUCTS['billboard-ad'];
    } else if (titleLower.includes('pack') || titleLower.includes('skin') || titleLower.includes('禮包') || titleLower.includes('礼包')) {
      product = PAYMENT_PRODUCTS['shop-genesis-pack'];
    }

    // Match user by email / username / userId written in buyer's Afdian remark (optional)
    let targetUser = null;
    if (remark) {
      const tokens = remark.split(/[\s,;|]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
      targetUser = Object.values(s.users || {}).find((u) => {
        if (!u) return false;
        const candidates = [u.id, u.username, u.email].filter(Boolean).map((v) => String(v).toLowerCase());
        return tokens.some((tk) => candidates.includes(tk));
      }) || null;
    }

    const now = new Date().toISOString();
    const order = {
      id: uid('ord'),
      method: 'afdian',
      provider: 'afdian',
      userId: targetUser ? targetUser.id : null,
      userName: targetUser ? targetUser.displayName : (remark || '愛發電贊助者'),
      productId: product.id,
      productName: planTitle || product.name,
      targetProjectId: product.requiresProject ? (s.projects[0]?.id || null) : null,
      billboardText: '',
      amountUsd: usdEstimate > 0 ? usdEstimate : product.priceUsd,
      amountCny: cnyAmount,
      chain: null,
      token: 'CNY',
      receiverAddress: null,
      memoCode: `AFD-${outTradeNo.slice(-6).toUpperCase()}`,
      status: targetUser ? 'confirmed' : 'pending',
      txHash: `afdian:${outTradeNo}`,
      sandboxSimulated: false,
      createdAt: now,
      expiresAt: null,
      confirmedAt: targetUser ? now : null,
    };

    s.paymentOrders.unshift(order);
    if (s.paymentOrders.length > 200) s.paymentOrders.length = 200;
    recordedOrderId = order.id;

    if (targetUser) {
      fulfillProductForUser(s, targetUser, {
        product,
        amountUsd: order.amountUsd,
        targetProjectId: order.targetProjectId,
        channelLabel: `愛發電 Webhook (${outTradeNo.slice(-6)})`,
      });
      fulfilledOrderId = order.id;
    } else {
      pushFeed(s, {
        type: 'payment',
        icon: '⚡',
        message: `收到愛發電新訂單 ${order.memoCode}（¥${cnyAmount || 0} / ${order.productName}）`,
      });
    }
  });

  store.appendAudit?.(
    'afdian_webhook_order',
    `Afdian order ${outTradeNo} (¥${cnyAmount || 0}) recorded=${recordedOrderId} autoFulfilled=${Boolean(fulfilledOrderId)}`,
  );
  if (fulfilledOrderId) {
    sseHub?.broadcast('payment_confirmed', { orderId: fulfilledOrderId, provider: 'afdian' });
  } else {
    sseHub?.broadcast('payment_order_created', { orderId: recordedOrderId, provider: 'afdian' });
  }
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });

  // Afdian strictly requires HTTP 200 with { ec: 200, em: "" }
  return sendJson(res, 200, {
    ec: 200,
    em: '',
    ok: true,
    orderId: recordedOrderId,
    fulfilledOrderId,
  });
}

export async function handleAdminPayoutBatch(req, res, url, store) {
  const state = await store.load();
  ensureStateSchema(state);
  const ctx = getActiveUserContext(req, state);
  if (!isFounderAdmin(req, ctx)) {
    return sendJson(res, 403, { ok: false, code: 'ADMIN_ONLY', error: '僅限創始鎮長檢視批次打帳對帳單' });
  }

  const filterChain = String(url?.searchParams?.get('chain') || '').trim().toLowerCase();
  const filterToken = String(url?.searchParams?.get('token') || '').trim().toUpperCase();

  const pending = (state.payouts || []).filter((p) => {
    if (p.status !== 'pending') return false;
    if (filterChain && String(p.chain || '').toLowerCase() !== filterChain) return false;
    if (filterToken && String(p.token || '').toUpperCase() !== filterToken) return false;
    return true;
  });

  const groups = new Map();
  for (const p of pending) {
    const chain = String(p.chain || 'base').toLowerCase();
    const token = String(p.token || 'USDC').toUpperCase();
    const key = `${chain}:${token}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        chain,
        token,
        payoutIds: [],
        recipientMap: new Map(),
      });
    }
    const grp = groups.get(key);
    grp.payoutIds.push(p.id);

    const addr = String(p.address || '').trim();
    const addrKey = chain === 'solana' || chain === 'tron' ? addr : addr.toLowerCase();
    if (!grp.recipientMap.has(addrKey)) {
      grp.recipientMap.set(addrKey, {
        address: addr,
        totalAmountUsd: 0,
        userNames: [],
        payoutIds: [],
        validAddress: validateWalletAddress(chain, addr),
      });
    }
    const rec = grp.recipientMap.get(addrKey);
    rec.totalAmountUsd = round2(rec.totalAmountUsd + (Number(p.amountUsd) || 0));
    rec.payoutIds.push(p.id);
    if (p.userName && !rec.userNames.includes(p.userName)) {
      rec.userNames.push(p.userName);
    }
  }

  const batches = [];
  for (const grp of groups.values()) {
    const recipients = [...grp.recipientMap.values()].sort((a, b) => b.totalAmountUsd - a.totalAmountUsd);
    const totalAmountUsd = round2(recipients.reduce((s, r) => s + r.totalAmountUsd, 0));
    const reconciliationOk = recipients.every((r) => r.validAddress && r.totalAmountUsd >= MIN_PAYOUT_USD);
    const disperseText = recipients
      .map((r) => `${r.address},${r.totalAmountUsd.toFixed(2)}`)
      .join('\n');
    const csvHeader = 'address,amount,token,chain,users,payout_ids';
    const csvRows = recipients.map((r) => [
      r.address,
      r.totalAmountUsd.toFixed(2),
      grp.token,
      grp.chain,
      `"${r.userNames.join(' / ').replace(/"/g, '""')}"`,
      `"${r.payoutIds.join('|')}"`,
    ].join(','));
    const csvText = [csvHeader, ...csvRows].join('\n');

    batches.push({
      key: grp.key,
      chain: grp.chain,
      token: grp.token,
      payoutIds: grp.payoutIds,
      payoutCount: grp.payoutIds.length,
      recipientCount: recipients.length,
      totalAmountUsd,
      reconciliationOk,
      recipients,
      disperseText,
      csvText,
    });
  }

  const grandTotalUsd = round2(batches.reduce((s, b) => s + b.totalAmountUsd, 0));
  return sendJson(res, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    pendingCount: pending.length,
    batchCount: batches.length,
    grandTotalUsd,
    batches,
  });
}

export async function handleAdminBatchMarkPaid(req, res, body, store, sseHub) {
  const rawIds = Array.isArray(body?.payoutIds) ? body.payoutIds.map((x) => String(x || '').trim()).filter(Boolean) : [];
  if (rawIds.length === 0) {
    return sendJson(res, 400, { ok: false, error: '請提供至少一筆待打款 payoutIds' });
  }

  const simulate = Boolean(body?.simulate);
  const note = sanitizeText(body?.note, 80);
  let errStatus = null;
  let errCode = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (!isFounderAdmin(req, ctx)) {
      errStatus = 403;
      errCode = 'ADMIN_ONLY';
      errMessage = '僅限創始鎮長執行批次打帳銷帳';
      return null;
    }

    const targets = rawIds
      .map((id) => (s.payouts || []).find((p) => p.id === id))
      .filter((p) => p && p.status === 'pending');

    if (targets.length === 0) {
      errStatus = 404;
      errMessage = '找不到對應的待打款提領單（可能均已完成打款）';
      return null;
    }

    const primaryChain = String(body?.chain || targets[0].chain || 'base').toLowerCase();
    const txHash = simulate
      ? generateSandboxTxHash(primaryChain)
      : sanitizeText(body?.txHash, 120);

    if (!validateTxHash(primaryChain, txHash)) {
      errStatus = 400;
      errMessage = `無效的 ${primaryChain.toUpperCase()} 批次交易 TxHash 格式`;
      return null;
    }

    const now = new Date().toISOString();
    let totalAmountUsd = 0;
    const settledIds = [];
    for (const p of targets) {
      p.status = 'paid';
      p.txHash = txHash;
      p.sandboxSimulated = simulate;
      p.paidAt = now;
      p.batchNote = note || `Batch (${targets.length} payouts)`;
      totalAmountUsd = round2(totalAmountUsd + (Number(p.amountUsd) || 0));
      settledIds.push(p.id);
    }

    pushFeed(s, {
      type: 'payout',
      icon: '⚡',
      message: `鎮長完成批次打帳：一次結算 ${settledIds.length} 筆提領（合計 $${totalAmountUsd.toFixed(2)} ${targets[0].token} · ${primaryChain.toUpperCase()}）`,
    });

    return {
      settledCount: settledIds.length,
      settledIds,
      totalAmountUsd,
      chain: primaryChain,
      token: targets[0].token,
      txHash,
      userId: ctx.userId,
    };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, ...(errCode ? { code: errCode } : {}), error: errMessage });
  }

  store.appendAudit?.('payout_batch_paid', `Batch paid ${result.settledCount} payouts ($${result.totalAmountUsd.toFixed(2)} ${result.token} on ${result.chain}) tx=${result.txHash.slice(0, 16)}`);
  sseHub?.broadcast('payout_batch_paid', {
    settledCount: result.settledCount,
    totalAmountUsd: result.totalAmountUsd,
    txHash: result.txHash,
  });
  sseHub?.broadcast('state_sync', { updatedAt: state.updatedAt });
  return sendJson(res, 200, {
    ok: true,
    ...result,
    state: projectStateForUser(state, result.userId),
  });
}

export async function handleAdminConfirmOrder(req, res, orderId, body, store, sseHub) {
  let errStatus = null;
  let errCode = null;
  let errMessage = null;

  const { state, result } = await store.mutate((s) => {
    ensureStateSchema(s);
    const ctx = getActiveUserContext(req, s);
    if (!isFounderAdmin(req, ctx)) {
      errStatus = 403;
      errCode = 'ADMIN_ONLY';
      errMessage = '僅限創始鎮長核准到帳訂單';
      return null;
    }

    const order = (s.paymentOrders || []).find((o) => o.id === orderId);
    if (!order) {
      errStatus = 404;
      errMessage = `找不到訂單：${orderId}`;
      return null;
    }
    if (order.status === 'confirmed') {
      errStatus = 409;
      errMessage = '此訂單已確認到帳';
      return null;
    }

    const product = resolvePaymentProduct(order.productId);
    const targetUser = s.users[order.userId] || ctx.user;
    const txHash = sanitizeText(body?.txHash, 120) || order.txHash || `admin-verified-${crypto.randomBytes(6).toString('hex')}`;

    order.status = 'confirmed';
    order.txHash = txHash;
    order.confirmedAt = new Date().toISOString();
    order.adminVerified = true;

    const rewardSummary = fulfillProductForUser(s, targetUser, {
      product,
      amountUsd: order.amountUsd,
      targetProjectId: order.targetProjectId,
      billboardText: order.billboardText,
      channelLabel: `鎮長核實到帳 (${order.chain ? `${order.token}·${order.chain.toUpperCase()}` : order.provider})`,
    });

    return { order, rewardSummary, userId: ctx.userId };
  });

  if (errStatus) {
    return sendJson(res, errStatus, { ok: false, ...(errCode ? { code: errCode } : {}), error: errMessage });
  }

  store.appendAudit?.('admin_order_confirmed', `Founder confirmed order ${result.order.id} ($${result.order.amountUsd})`);
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
