const DEFAULT_MESSAGE = 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.';

function clientKey(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}

export function createRateLimiter({
  windowMs,
  limit,
  message = DEFAULT_MESSAGE,
  keyGenerator = clientKey,
  skip = () => process.env.NODE_ENV === 'test'
}) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new TypeError('Rate limiter windowMs must be a positive number');
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError('Rate limiter limit must be a positive integer');
  }

  const requests = new Map();
  let requestCount = 0;

  function removeExpiredEntries(now) {
    requestCount += 1;
    if (requestCount % 500 !== 0) return;

    for (const [key, entry] of requests.entries()) {
      if (entry.resetAt <= now) {
        requests.delete(key);
      }
    }
  }

  return function rateLimiter(req, res, next) {
    if (skip(req)) return next();

    const now = Date.now();
    removeExpiredEntries(now);

    const key = String(keyGenerator(req) || clientKey(req));
    let entry = requests.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      requests.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(limit - entry.count, 0);
    const resetAfterSeconds = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);

    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetAfterSeconds));

    if (entry.count > limit) {
      res.setHeader('Retry-After', String(resetAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
        details: null,
        data: null
      });
    }

    return next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Bạn đã thử xác thực quá nhiều lần. Vui lòng thử lại sau 15 phút.'
});

export const otpRequestRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: 'Bạn đã yêu cầu mã OTP quá nhiều lần. Vui lòng thử lại sau 10 phút.'
});

export const otpVerificationRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  message: 'Bạn đã nhập mã xác thực quá nhiều lần. Vui lòng thử lại sau 10 phút.'
});

export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: 'Bạn đã sử dụng tư vấn AI quá nhiều lần. Vui lòng thử lại sau.'
});
