export const API_URL = (chain: string, currency: string = 'usd') =>
  `https://api.coingecko.com/api/v3/simple/price?ids=${chain}&vs_currencies=${currency}`;
