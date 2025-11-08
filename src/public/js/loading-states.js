/**
 * Loading States Manager
 * Handles loading indicators and skeleton screens
 */

class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.init();
  }

  init() {
    this.createStyles();
  }

  createStyles() {
    if (document.getElementById('loading-styles')) return;

    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
      }

      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .loading-dots {
        display: inline-flex;
        gap: 8px;
      }

      .loading-dot {
        width: 8px;
        height: 8px;
        background: #667eea;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
      }

      .loading-dot:nth-child(1) { animation-delay: -0.32s; }
      .loading-dot:nth-child(2) { animation-delay: -0.16s; }

      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }

      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s ease-in-out infinite;
        border-radius: 4px;
      }

      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      .skeleton-text {
        height: 16px;
        margin-bottom: 8px;
      }

      .skeleton-title {
        height: 24px;
        width: 60%;
        margin-bottom: 12px;
      }

      .skeleton-card {
        height: 120px;
        margin-bottom: 16px;
      }

      .btn-loading {
        position: relative;
        pointer-events: none;
        opacity: 0.7;
      }

      .btn-loading::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        top: 50%;
        left: 50%;
        margin-left: -8px;
        margin-top: -8px;
        border: 2px solid #ffffff;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      [data-theme="dark"] .skeleton {
        background: linear-gradient(90deg, #1a202c 25%, #2d3748 50%, #1a202c 75%);
        background-size: 200% 100%;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show full-page loading overlay
   */
  showOverlay(message = 'Loading...') {
    const id = 'loading-overlay-' + Date.now();
    this.activeLoaders.add(id);

    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="text-center text-white">
        <div class="loading-spinner mx-auto mb-3"></div>
        <div>${message}</div>
      </div>
    `;
    document.body.appendChild(overlay);

    return id;
  }

  /**
   * Hide loading overlay
   */
  hideOverlay(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.remove();
      this.activeLoaders.delete(id);
    }
  }

  /**
   * Show loading in specific element
   */
  showInElement(element, type = 'spinner') {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }

    if (!element) return;

    element.dataset.originalContent = element.innerHTML;
    
    if (type === 'spinner') {
      element.innerHTML = `
        <div class="text-center py-4">
          <div class="loading-spinner mx-auto"></div>
        </div>
      `;
    } else if (type === 'dots') {
      element.innerHTML = `
        <div class="text-center py-4">
          <div class="loading-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
        </div>
      `;
    } else if (type === 'skeleton') {
      element.innerHTML = this.getSkeletonHTML(element.dataset.skeletonType || 'card');
    }
  }

  /**
   * Hide loading from element
   */
  hideFromElement(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }

    if (!element) return;

    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
    }
  }

  /**
   * Show button loading state
   */
  showButtonLoading(button, text = null) {
    if (typeof button === 'string') {
      button = document.querySelector(button);
    }

    if (!button) return;

    button.dataset.originalText = button.innerHTML;
    button.classList.add('btn-loading');
    button.disabled = true;

    if (text) {
      button.innerHTML = text;
    }
  }

  /**
   * Hide button loading state
   */
  hideButtonLoading(button) {
    if (typeof button === 'string') {
      button = document.querySelector(button);
    }

    if (!button) return;

    button.classList.remove('btn-loading');
    button.disabled = false;

    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  /**
   * Get skeleton HTML
   */
  getSkeletonHTML(type = 'card') {
    switch (type) {
      case 'card':
        return `
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        `;
      case 'list':
        return `
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
        `;
      case 'table':
        return `
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
        `;
      default:
        return '<div class="skeleton skeleton-card"></div>';
    }
  }

  /**
   * Wrap async function with loading state
   */
  async withLoading(fn, options = {}) {
    const {
      overlay = false,
      element = null,
      button = null,
      message = 'Loading...',
      type = 'spinner'
    } = options;

    let loaderId = null;

    try {
      if (overlay) {
        loaderId = this.showOverlay(message);
      } else if (element) {
        this.showInElement(element, type);
      } else if (button) {
        this.showButtonLoading(button);
      }

      const result = await fn();
      return result;
    } finally {
      if (loaderId) {
        this.hideOverlay(loaderId);
      } else if (element) {
        this.hideFromElement(element);
      } else if (button) {
        this.hideButtonLoading(button);
      }
    }
  }
}

// Create global instance
const loadingManager = new LoadingManager();

// Export for use
window.loadingManager = loadingManager;

// Convenience functions
window.showLoading = (message) => loadingManager.showOverlay(message);
window.hideLoading = (id) => loadingManager.hideOverlay(id);
window.withLoading = (fn, options) => loadingManager.withLoading(fn, options);
