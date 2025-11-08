/**
 * Toast Notification System
 * Beautiful, customizable toast notifications
 */

class ToastManager {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.init();
  }

  init() {
    this.createContainer();
    this.createStyles();
  }

  createContainer() {
    if (document.getElementById('toast-container')) return;

    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  createStyles() {
    if (document.getElementById('toast-styles')) return;

    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      }

      .toast {
        background: white;
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease-out;
        position: relative;
        overflow: hidden;
      }

      .toast::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
      }

      .toast.success::before { background: #10b981; }
      .toast.error::before { background: #ef4444; }
      .toast.warning::before { background: #f59e0b; }
      .toast.info::before { background: #3b82f6; }

      .toast-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 14px;
      }

      .toast.success .toast-icon {
        background: #d1fae5;
        color: #10b981;
      }

      .toast.error .toast-icon {
        background: #fee2e2;
        color: #ef4444;
      }

      .toast.warning .toast-icon {
        background: #fef3c7;
        color: #f59e0b;
      }

      .toast.info .toast-icon {
        background: #dbeafe;
        color: #3b82f6;
      }

      .toast-content {
        flex: 1;
      }

      .toast-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #1f2937;
      }

      .toast-message {
        font-size: 14px;
        color: #6b7280;
      }

      .toast-close {
        flex-shrink: 0;
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .toast-close:hover {
        background: #f3f4f6;
        color: #4b5563;
      }

      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        opacity: 0.3;
        animation: progress linear;
      }

      .toast.success .toast-progress { color: #10b981; }
      .toast.error .toast-progress { color: #ef4444; }
      .toast.warning .toast-progress { color: #f59e0b; }
      .toast.info .toast-progress { color: #3b82f6; }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }

      @keyframes progress {
        from { width: 100%; }
        to { width: 0%; }
      }

      .toast.removing {
        animation: slideOut 0.3s ease-out forwards;
      }

      /* Dark mode support */
      [data-theme="dark"] .toast {
        background: #1f2937;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      [data-theme="dark"] .toast-title {
        color: #f3f4f6;
      }

      [data-theme="dark"] .toast-message {
        color: #9ca3af;
      }

      [data-theme="dark"] .toast-close {
        color: #6b7280;
      }

      [data-theme="dark"] .toast-close:hover {
        background: #374151;
        color: #9ca3af;
      }

      /* Mobile responsive */
      @media (max-width: 640px) {
        .toast-container {
          left: 10px;
          right: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show toast notification
   */
  show(message, type = 'info', options = {}) {
    const {
      title = null,
      duration = 5000,
      closable = true,
      icon = null,
    } = options;

    const toast = this.createToast(message, type, title, closable, icon, duration);
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * Create toast element
   */
  createToast(message, type, title, closable, customIcon, duration) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '<i class="fas fa-check"></i>',
      error: '<i class="fas fa-times"></i>',
      warning: '<i class="fas fa-exclamation"></i>',
      info: '<i class="fas fa-info"></i>',
    };

    const icon = customIcon || icons[type] || icons.info;

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      ${closable ? '<button class="toast-close"><i class="fas fa-times"></i></button>' : ''}
      ${duration > 0 ? `<div class="toast-progress" style="animation-duration: ${duration}ms"></div>` : ''}
    `;

    if (closable) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.remove(toast));
    }

    return toast;
  }

  /**
   * Remove toast
   */
  remove(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 300);
  }

  /**
   * Remove all toasts
   */
  clear() {
    this.toasts.forEach(toast => this.remove(toast));
  }

  /**
   * Convenience methods
   */
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
}

// Create global instance
const toastManager = new ToastManager();

// Export for use
window.toastManager = toastManager;
window.showToast = (message, type, options) => toastManager.show(message, type, options);
window.toast = {
  success: (message, options) => toastManager.success(message, options),
  error: (message, options) => toastManager.error(message, options),
  warning: (message, options) => toastManager.warning(message, options),
  info: (message, options) => toastManager.info(message, options),
};
