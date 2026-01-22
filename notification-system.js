/**
 * Sistema de Notificaciones Modernas
 * Reemplaza los alertas por notificaciones centradas en la pantalla
 */

class NotificationSystem {
  constructor() {
    this.createContainer();
  }

  createContainer() {
    if (document.getElementById('notification-container')) return;

    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }

  show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const uniqueId = `notification-${Date.now()}`;

    notification.id = uniqueId;
    notification.className = `notification notification-${type} notification-enter`;
    notification.setAttribute('role', 'alert');

    // Íconos según el tipo
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ⓘ'
    };

    notification.innerHTML = `
      <div class="notification-icon">${icons[type] || icons.info}</div>
      <div class="notification-content">
        <p>${message}</p>
      </div>
      <button class="notification-close" aria-label="Cerrar notificación">&times;</button>
    `;

    container.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);

    // Cerrar al hacer click en el botón
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.closeNotification(uniqueId);
    });

    // Auto-cerrar después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => {
        this.closeNotification(uniqueId);
      }, duration);
    }

    return uniqueId;
  }

  closeNotification(id) {
    const notification = document.getElementById(id);
    if (!notification) return;

    notification.classList.add('notification-exit');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }

  success(message, duration = 4000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 4000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }

  // Notificación de confirmación (sin auto-cerrar)
  confirm(message, onConfirm, onCancel) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const uniqueId = `notification-${Date.now()}`;

    notification.id = uniqueId;
    notification.className = 'notification notification-confirm notification-enter';

    notification.innerHTML = `
      <div class="notification-content">
        <p>${message}</p>
      </div>
      <div class="notification-buttons">
        <button class="notification-confirm-btn notification-yes">Sí</button>
        <button class="notification-confirm-btn notification-no">No</button>
      </div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);

    notification.querySelector('.notification-yes').addEventListener('click', () => {
      this.closeNotification(uniqueId);
      if (typeof onConfirm === 'function') onConfirm();
    });

    notification.querySelector('.notification-no').addEventListener('click', () => {
      this.closeNotification(uniqueId);
      if (typeof onCancel === 'function') onCancel();
    });

    return uniqueId;
  }
}

// Instancia global
window.notificationSystem = new NotificationSystem();
