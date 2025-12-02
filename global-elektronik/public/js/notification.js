// notification.js - FIXED VERSION
const NOTIFICATION_CONFIG = {
    success: {
        icon: '✅',
        title: 'Sukses!',
        color: '#10B981'
    },
    error: {
        icon: '❌',
        title: 'Error!',
        color: '#EF4444'
    },
    warning: {
        icon: '⚠️',
        title: 'Peringatan!',
        color: '#F59E0B'
    },
    info: {
        icon: 'ℹ️',
        title: 'Info',
        color: '#3B82F6'
    }
};

class NotificationSystem {
    constructor() {
        this.currentNotification = null;
        this.init();
    }

    init() {
        // Event delegation untuk handle klik
        document.addEventListener('click', (e) => {
            // Handle overlay click
            if (e.target.classList.contains('notification-overlay')) {
                this.close();
                return;
            }
            
            // Handle confirm button click menggunakan event delegation
            if (e.target.classList.contains('notification-confirm-btn')) {
                e.stopPropagation();
                this.confirm();
                return;
            }
            
            // Handle close button click
            if (e.target.classList.contains('notification-close-btn') || 
                e.target.closest('.notification-close-btn')) {
                e.stopPropagation();
                this.close();
                return;
            }
        });

        // Tekan Escape untuk menutup
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentNotification) {
                this.close();
            }
        });
    }

    show(title, message, type = 'success', options = {}) {
        // Close existing notification first
        this.close();

        const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.success;
        const {
            duration = 4000,
            onClose = null,
            onConfirm = null,
            confirmText = 'Tutup',
            showCloseButton = true,
            showConfirmButton = true
        } = options;

        // Generate unique ID untuk notification
        const notificationId = 'notification-' + Date.now();

        // Template notifikasi yang diperbaiki
        const notificationHTML = `
            <div class="notification-overlay"></div>
            <div class="notification-container" id="${notificationId}">
                <div class="notification ${type}">
                    ${showCloseButton ? `
                        <button class="notification-close-btn absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    ` : ''}
                    <div class="notification-icon">${config.icon}</div>
                    <div class="notification-content">
                        <div class="notification-title">${title || config.title}</div>
                        <div class="notification-message">${message}</div>
                        ${showConfirmButton ? `
                            <div class="notification-actions">
                                <button class="notification-button notification-button-primary notification-confirm-btn">
                                    ${confirmText}
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Masukkan ke body
        document.body.insertAdjacentHTML('beforeend', notificationHTML);

        // Ambil elemen yang baru dimasukkan
        const element = document.getElementById(notificationId);
        const overlay = document.querySelector('.notification-overlay');

        // Simpan state notifikasi saat ini
        this.currentNotification = {
            element,
            overlay,
            type,
            onClose,
            onConfirm,
            timeoutId: null,
            id: notificationId
        };

        // Auto close jika ada durasi
        if (duration > 0) {
            this.currentNotification.timeoutId = setTimeout(() => {
                this.close();
            }, duration);
        }

        // Focus pada tombol confirm untuk aksesibilitas
        setTimeout(() => {
            const confirmBtn = element.querySelector('.notification-confirm-btn');
            if (confirmBtn) {
                confirmBtn.focus();
            }
        }, 100);

        return this;
    }

    close() {
        if (!this.currentNotification) return;

        const { element, overlay, onClose, timeoutId } = this.currentNotification;

        // Clear timeout jika ada
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Animasi keluar
        if (element) {
            element.style.animation = 'fadeOut 0.3s ease-in forwards';
        }
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease-in forwards';
        }

        // Hapus elemen setelah animasi
        setTimeout(() => {
            if (element) element.remove();
            if (overlay) overlay.remove();
            
            // Panggil callback onClose
            if (onClose && typeof onClose === 'function') {
                onClose();
            }
            
            // Reset current notification
            this.currentNotification = null;
        }, 300);
    }

    confirm() {
        if (!this.currentNotification) return;

        const { onConfirm } = this.currentNotification;

        // Panggil callback onConfirm jika ada
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }

        this.close();
    }

    // Method helper untuk tipe notifikasi yang berbeda
    success(message, title, options = {}) {
        return this.show(title, message, 'success', { 
            confirmText: 'Tutup',
            ...options 
        });
    }

    error(message, title, options = {}) {
        return this.show(title, message, 'error', { 
            confirmText: 'Tutup',
            ...options 
        });
    }

    warning(message, title, options = {}) {
        return this.show(title, message, 'warning', { 
            confirmText: 'Tutup',
            ...options 
        });
    }

    info(message, title, options = {}) {
        return this.show(title, message, 'info', { 
            confirmText: 'Tutup',
            ...options 
        });
    }

    confirmDialog(message, title = 'Konfirmasi', onConfirm, options = {}) {
        return this.show(title, message, 'warning', {
            showConfirmButton: true,
            showCloseButton: true,
            duration: 0, // No auto-close untuk dialog konfirmasi
            confirmText: options.confirmText || 'Ya',
            onConfirm,
            ...options
        });
    }
}

// Inisialisasi dan ekspos ke global scope
window.notificationSystem = new NotificationSystem();