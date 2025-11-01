// ✅ Centralized API configuration for all frontend files
const CONFIG = {
  // Auto-detect environment
  get API_URL() {
    const hostname = window.location.hostname;
    
    // Production (Vercel)
    if (hostname.includes('vercel.app') || window.location.protocol === 'https:') {
      return window.location.origin + '/api';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    
    // Fallback
    return '/api';
  },
  
  get BASE_URL() {
    return this.API_URL.replace('/api', '');
  },
  
  get WS_URL() {
    return this.BASE_URL;
  }
};

// Export for use in other scripts
window.CONFIG = CONFIG;

console.log('🔧 API Configuration:', {
  API_URL: CONFIG.API_URL,
  BASE_URL: CONFIG.BASE_URL,
  WS_URL: CONFIG.WS_URL
});