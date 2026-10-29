// ============================================================
// Perfinted — Client Configuration & API Connection
// ============================================================
// To connect to a remote backend server or custom domain name:
// 1. Enter your server URL below (e.g. 'https://api.yourdomain.com' or 'https://your-app.onrender.com')
// 2. Or configure it directly in the Admin Panel under "Server Settings".
// If hosted on the same domain or localhost, leave it as '' (empty string).

const PERFINTED_CONFIG = {
    // Default server/domain URL (empty string = same host / relative path)
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
        return this.DEFAULT_API_URL.trim().replace(/\/+$/, '');
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
