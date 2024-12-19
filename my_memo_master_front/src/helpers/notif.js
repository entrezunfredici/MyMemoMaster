import { useToast } from 'vue-toastification';
import { isMobile } from '@/helpers/functions.js'

const toast = useToast();

function notify(message, type = 'info') {
    if (['info', 'success', 'error', 'warning'].includes(type) === false) {
        type = 'info';
        console.error('Invalid type for notification. Defaulting to info.');
    }

    toast[type](message, {
        position: isMobile() ? 'top-right' : 'bottom-right',
        timeout: 4000,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        draggablePercent: 0.6,
        showCloseButtonOnHover: false,
        hideProgressBar: true,
        closeButton: 'button',
        icon: false,
        rtl: false
    });
}

function clear() {
    toast.clear();
}

export const notif = {
    notify,
    clear
}