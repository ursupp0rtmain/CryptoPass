// CryptoPass Extension Configuration
// Update these values for your deployment

const CONFIG = {
  // Your Ceramic node URL
  CERAMIC_URL: 'https://ceramic.ursupportmain.com',

  // Your frontend URL (for sync)
  FRONTEND_URL: 'https://passs.ursupportmain.com',

  // Version
  VERSION: '1.0.0'
};

// For Chrome extension context
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
