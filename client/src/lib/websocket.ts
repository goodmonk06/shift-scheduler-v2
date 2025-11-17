/**
 * WebSocket Client for Real-time Notifications
 *
 * This module handles the client-side WebSocket connection for receiving
 * real-time notifications and updates.
 */

import { io, Socket } from 'socket.io-client';

interface NotificationData {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface WebSocketEvents {
  onNotification?: (data: NotificationData) => void;
  onNotificationRead?: (notificationId: number) => void;
  onAllNotificationsRead?: (employeeId: number) => void;
  onNotificationsList?: (notifications: any[]) => void;
  onConnectionStatusChange?: (status: 'connected' | 'disconnected') => void;
  onError?: (error: string) => void;
}

class NotificationWebSocketClient {
  private socket: Socket | null = null;
  private employeeId: number | null = null;
  private role: 'admin' | 'employee' | null = null;
  private events: WebSocketEvents = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isIntentionalDisconnect = false;

  /**
   * Connect to the WebSocket server
   */
  public connect(
    employeeId: number,
    role: 'admin' | 'employee',
    events?: WebSocketEvents
  ) {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.employeeId = employeeId;
    this.role = role;
    this.events = events || {};
    this.isIntentionalDisconnect = false;

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.setupEventListeners();
    this.joinRoom();
  }

  /**
   * Set up event listeners for WebSocket events
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      if (this.events.onConnectionStatusChange) {
        this.events.onConnectionStatusChange('connected');
      }

      // Rejoin room after reconnection
      if (this.employeeId && this.role) {
        this.joinRoom();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);

      if (this.events.onConnectionStatusChange) {
        this.events.onConnectionStatusChange('disconnected');
      }

      // Handle reconnection
      if (!this.isIntentionalDisconnect && reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);

      if (this.events.onError) {
        this.events.onError(`接続エラー: ${error.message}`);
      }
    });

    // Notification events
    this.socket.on('notification', (data: NotificationData) => {
      console.log('New notification received:', data);

      if (this.events.onNotification) {
        this.events.onNotification(data);
      }

      // Show browser notification if supported and permitted
      this.showBrowserNotification(data);
    });

    this.socket.on('notification_read', ({ notificationId }) => {
      if (this.events.onNotificationRead) {
        this.events.onNotificationRead(notificationId);
      }
    });

    this.socket.on('all_notifications_read', ({ employeeId }) => {
      if (this.events.onAllNotificationsRead) {
        this.events.onAllNotificationsRead(employeeId);
      }
    });

    this.socket.on('notifications_list', ({ notifications }) => {
      if (this.events.onNotificationsList) {
        this.events.onNotificationsList(notifications);
      }
    });

    this.socket.on('connection_status', ({ status }) => {
      if (this.events.onConnectionStatusChange) {
        this.events.onConnectionStatusChange(status);
      }
    });

    this.socket.on('error', ({ message }) => {
      console.error('WebSocket error:', message);

      if (this.events.onError) {
        this.events.onError(message);
      }
    });
  }

  /**
   * Join the appropriate room for receiving notifications
   */
  private joinRoom() {
    if (!this.socket || !this.employeeId || !this.role) return;

    this.socket.emit('join_room', {
      employeeId: this.employeeId,
      role: this.role
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      if (this.events.onError) {
        this.events.onError('接続を再確立できませんでした。ページをリロードしてください。');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 10000);

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(() => {
      if (this.employeeId && this.role && !this.socket?.connected) {
        this.connect(this.employeeId, this.role, this.events);
      }
    }, delay);
  }

  /**
   * Show browser notification if supported and permitted
   */
  private async showBrowserNotification(data: NotificationData) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return;
    }

    // Check permission
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    // Create notification
    const notification = new Notification(data.title, {
      body: data.message,
      icon: '/notification-icon.png',
      badge: '/badge-icon.png',
      tag: `notification-${data.id}`,
      timestamp: new Date(data.timestamp).getTime(),
      requireInteraction: data.priority === 'high'
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();

      // Navigate to relevant page based on notification type
      // This could be customized based on the notification type
      window.location.href = '/notifications';
    };

    // Auto-close low priority notifications after 5 seconds
    if (data.priority === 'low') {
      setTimeout(() => notification.close(), 5000);
    }
  }

  /**
   * Update event handlers
   */
  public updateEvents(events: Partial<WebSocketEvents>) {
    this.events = { ...this.events, ...events };
  }

  /**
   * Mark a notification as read
   */
  public markNotificationAsRead(notificationId: number) {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected');
      return;
    }

    this.socket.emit('mark_notification_read', { notificationId });
  }

  /**
   * Mark all notifications as read for the current employee
   */
  public markAllNotificationsAsRead() {
    if (!this.socket?.connected || !this.employeeId) {
      console.warn('WebSocket not connected or employee ID not set');
      return;
    }

    this.socket.emit('mark_all_read', { employeeId: this.employeeId });
  }

  /**
   * Request recent notifications
   */
  public requestNotifications(limit: number = 10) {
    if (!this.socket?.connected || !this.employeeId) {
      console.warn('WebSocket not connected or employee ID not set');
      return;
    }

    this.socket.emit('request_notifications', {
      employeeId: this.employeeId,
      limit
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect() {
    this.isIntentionalDisconnect = true;

    if (this.socket) {
      if (this.employeeId) {
        this.socket.emit('leave_room', { employeeId: this.employeeId });
      }
      this.socket.disconnect();
      this.socket = null;
    }

    this.employeeId = null;
    this.role = null;
    this.events = {};
  }

  /**
   * Check if the client is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get the current connection status
   */
  public getConnectionStatus(): 'connected' | 'disconnected' {
    return this.socket?.connected ? 'connected' : 'disconnected';
  }

  /**
   * Request browser notification permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }
}

// Create a singleton instance
const notificationClient = new NotificationWebSocketClient();

export default notificationClient;