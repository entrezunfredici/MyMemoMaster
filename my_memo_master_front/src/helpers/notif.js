import { useToast } from 'vue-toastification';
import { isMobile } from '@/helpers/functions.js'

const toast = useToast();

function notify(message, type = 'info') {
    // ? type can either be 'info', 'success', 'error' or 'warning'
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
        icon: true,
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