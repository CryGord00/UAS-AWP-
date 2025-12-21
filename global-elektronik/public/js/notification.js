// notification.js - FINAL FIXED VERSION
const NOTIFICATION_CONFIG = {
    success: { icon: '✅', title: 'Sukses!', color: '#10B981' },
    error: { icon: '❌', title: 'Error!', color: '#EF4444' },
    warning: { icon: '⚠️', title: 'Peringatan!', color: '#F59E0B' },
    info: { icon: 'ℹ️', title: 'Info', color: '#3B82F6' }
};

class NotificationSystem {
    constructor() {
        this.currentNotification = null;
        this.init();
    }

    init() {
        // Event delegation untuk handle klik
        document.addEventListener('click', (e) => {
            // 1. Handle overlay click (klik di luar kotak)
            if (e.target.classList.contains('notification-overlay')) {
                this.close();
                return;
            }
            
            // 2. Handle confirm button click (FIXED: Menggunakan .closest agar lebih akurat)
            // Ini perbaikan utamanya: ganti .classList.contains menjadi .closest
            // supaya kalau user klik teks di dalam tombol, tombol tetap bekerja.
            const confirmBtn = e.target.closest('.notification-confirm-btn');
            if (confirmBtn) {
                e.preventDefault(); // Mencegah reload jika dalam form
                e.stopPropagation();
                this.confirm();
                return;
            }
            
            // 3. Handle close button click (X icon)
            const closeBtn = e.target.closest('.notification-close-btn');
            if (closeBtn) {
                e.preventDefault();
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

        const notificationId = 'notification-' + Date.now();

        // Template HTML (Ditambahkan type="button" agar aman di dalam form)
        const notificationHTML = `
            <div class="notification-overlay"></div>
            <div class="notification-container" id="${notificationId}">
                <div class="notification ${type}">
                    ${showCloseButton ? `
                        <button type="button" class="notification-close-btn absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition">
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
                                <button type="button" class="notification-button notification-button-primary notification-confirm-btn">
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

        // Simpan state
        this.currentNotification = {
            element,
            overlay,
            type,
            onClose,
            onConfirm,
            timeoutId: null,
            id: notificationId
        };

        // Auto close jika duration > 0
        if (duration > 0) {
            this.currentNotification.timeoutId = setTimeout(() => {
                this.close();
            }, duration);
        }

        // Focus management
        setTimeout(() => {
            const confirmBtn = element.querySelector('.notification-confirm-btn');
            if (confirmBtn) confirmBtn.focus();
        }, 100);

        return this;
    }

    close() {
        if (!this.currentNotification) return;

        const { element, overlay, onClose, timeoutId } = this.currentNotification;

        if (timeoutId) clearTimeout(timeoutId);

        // Animasi keluar manual via JS style agar lebih mulus
        if (element) {
            element.style.opacity = '0';
            element.style.transform = 'scale(0.95)';
            element.style.transition = 'all 0.2s ease-in';
        }
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'all 0.2s ease-in';
        }

        // Hapus elemen setelah animasi selesai
        setTimeout(() => {
            if (element) element.remove();
            if (overlay) overlay.remove();
            
            if (onClose && typeof onClose === 'function') {
                onClose();
            }
            
            this.currentNotification = null;
        }, 200);
    }

    confirm() {
        if (!this.currentNotification) return;

        const { onConfirm } = this.currentNotification;

        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }

        this.close();
    }

    // Helper methods
    success(message, title, options = {}) {
        return this.show(title, message, 'success', { confirmText: 'Tutup', ...options });
    }

    error(message, title, options = {}) {
        return this.show(title, message, 'error', { confirmText: 'Tutup', ...options });
    }

    warning(message, title, options = {}) {
        return this.show(title, message, 'warning', { confirmText: 'Tutup', ...options });
    }

    info(message, title, options = {}) {
        return this.show(title, message, 'info', { confirmText: 'Tutup', ...options });
    }

    // INI YANG TADI HILANG: Method untuk dialog konfirmasi
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

// Inisialisasi
window.notificationSystem = new NotificationSystem();