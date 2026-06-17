/**
 * Reusable WebSocket connection manager service.
 * Supports auto-reconnect, custom events, and status checks.
 */
class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.isConnected = false;
        this.reconnectInterval = 3000;
        this.url = null;
    }

    /**
     * Connect to the WebSocket server.
     * @param {string} url - WebSocket URL
     */
    connect(url) {
        this.url = url;
        const token = localStorage.getItem('authToken');
        const connectUrl = token ? `${url}?token=${token}` : url;
        
        console.log(`🔌 Connecting to WebSocket at: ${connectUrl}`);
        this.socket = new WebSocket(connectUrl);

        this.socket.onopen = () => {
            console.log('✅ WebSocket connection established.');
            this.isConnected = true;
            this._triggerEvent('open');
        };

        this.socket.onclose = (event) => {
            console.log(`🔌 WebSocket connection closed. Code: ${event.code}. Reconnecting in ${this.reconnectInterval}ms...`);
            this.isConnected = false;
            this._triggerEvent('close', event);
            setTimeout(() => this.connect(this.url), this.reconnectInterval);
        };

        this.socket.onerror = (error) => {
            console.error('❌ WebSocket error encountered:', error);
            this._triggerEvent('error', error);
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this._triggerEvent('message', message);
                if (message.type) {
                    this._triggerEvent(message.type, message.data || message);
                }
            } catch (error) {
                console.warn('⚠️ Received non-JSON message:', event.data);
                this._triggerEvent('raw-message', event.data);
            }
        };
    }

    /**
     * Send a message to the WebSocket server.
     * @param {Object|string} data - Payload to send
     */
    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            this.socket.send(payload);
        } else {
            console.warn('⚠️ Cannot send message: WebSocket is not open.');
        }
    }

    /**
     * Register a callback listener for a specific event.
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Callback function
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(callback);
    }

    /**
     * Unregister a callback listener.
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function
     */
    off(eventName, callback) {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).delete(callback);
        }
    }

    /**
     * Trigger all registered callbacks for an event.
     * @private
     * @param {string} eventName - Name of the event
     * @param {any} data - Data passed to callbacks
     */
    _triggerEvent(eventName, data) {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`Error in WebSocket listener for "${eventName}":`, err);
                }
            });
        }
    }
}

const socketService = new SocketService();
window.socketService = socketService;
