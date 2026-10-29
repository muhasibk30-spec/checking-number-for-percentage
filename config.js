// ============================================================
// Perfinted — Client Configuration & API Connection
// ============================================================
// To connect to a remote backend server or custom domain name:
// 1. Enter your server URL below (e.g. 'https://api.yourdomain.com' or 'https://your-app.onrender.com')
// 2. Or configure it directly in the Admin Panel under "Server Settings".

const PERFINTED_CONFIG = {
    // Default server/domain URL (empty string = auto-detects localhost:3000 or current host)
    DEFAULT_API_URL: '',

    // Get current active API Base URL
    getApiUrl() {
        const stored = localStorage.getItem('PERFINTED_API_URL');
        if (stored !== null && stored !== undefined && stored.trim() !== '') {
            return stored.trim().replace(/\/+$/, '');
        }
        if (window.PERFINTED_API_URL && window.PERFINTED_API_URL.trim() !== '') {
            return window.PERFINTED_API_URL.trim().replace(/\/+$/, '');
        }
        if (this.DEFAULT_API_URL && this.DEFAULT_API_URL.trim() !== '') {
            return this.DEFAULT_API_URL.trim().replace(/\/+$/, '');
        }
        // Auto-detect: If opened via file:/// or VS Code Live Server (port 5500/etc), connect to http://localhost:3000
        if (window.location.protocol === 'file:' || 
            (window.location.hostname === '127.0.0.1' && window.location.port !== '3000') ||
            (window.location.hostname === 'localhost' && window.location.port !== '3000')) {
            return 'http://localhost:3000';
        }
        return '';
    },

    // Save custom server/domain URL
    setApiUrl(url) {
        if (!url || !url.trim()) {
            localStorage.removeItem('PERFINTED_API_URL');
        } else {
            const cleaned = url.trim().replace(/\/+$/, '');
            localStorage.setItem('PERFINTED_API_URL', cleaned);
        }
    },

    // Helper for requests: builds complete URL
    buildUrl(endpoint) {
        const base = this.getApiUrl();
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return base ? `${base}${path}` : path;
    },

    // Helper for auth headers (supports token for cross-domain requests)
    getAuthHeaders(customHeaders = {}) {
        const token = localStorage.getItem('perfinted_token');
        const headers = { ...customHeaders };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }
};

window.PERFINTED_CONFIG = PERFINTED_CONFIG;
