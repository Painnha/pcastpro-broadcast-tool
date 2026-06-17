/**
 * Centralized API client service for PCastPro.
 * Handles HTTP requests, authorization headers, and error handling.
 */
class ApiService {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }

    /**
     * Set default headers including authentication token if present.
     * @private
     * @returns {Object} Headers object
     */
    _getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * Handle HTTP response.
     * @private
     * @param {Response} response - Fetch response object
     * @returns {Promise<any>} Response data
     */
    async _handleResponse(response) {
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            // Check for force logout indication
            if (data && data.forceLogout) {
                this.logout();
            }
            const error = (data && data.message) || response.statusText || 'Request failed';
            throw new Error(error);
        }

        return data;
    }

    /**
     * Perform a GET request.
     * @param {string} url - API endpoint
     * @returns {Promise<any>} response data
     */
    async get(url) {
        try {
            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'GET',
                headers: this._getHeaders()
            });
            return await this._handleResponse(response);
        } catch (error) {
            console.error(`API GET Error [${url}]:`, error);
            throw error;
        }
    }

    /**
     * Perform a POST request.
     * @param {string} url - API endpoint
     * @param {Object} body - Request body payload
     * @returns {Promise<any>} response data
     */
    async post(url, body) {
        try {
            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'POST',
                headers: this._getHeaders(),
                body: JSON.stringify(body)
            });
            return await this._handleResponse(response);
        } catch (error) {
            console.error(`API POST Error [${url}]:`, error);
            throw error;
        }
    }

    /**
     * Perform a PUT request.
     * @param {string} url - API endpoint
     * @param {Object} body - Request body payload
     * @returns {Promise<any>} response data
     */
    async put(url, body) {
        try {
            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'PUT',
                headers: this._getHeaders(),
                body: JSON.stringify(body)
            });
            return await this._handleResponse(response);
        } catch (error) {
            console.error(`API PUT Error [${url}]:`, error);
            throw error;
        }
    }

    /**
     * Log out the user by clearing local storage and redirecting.
     */
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionId');
        window.location.href = '/login.html';
    }
}

const API = new ApiService();
// Export to window for global access in Vanilla JS
window.API = API;
