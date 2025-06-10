
/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - Type of toast: 'info' (default), 'success', 'warning', 'error'.
 * @param {number} duration - How long the toast stays visible in ms. 0 for sticky.
 */
window.showToast = function(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn(`Toast container 'toast-container' not found. Toast message: [${type.toUpperCase()}] ${message}`); // Changed from alert
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type.toLowerCase()}`; 

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.innerHTML = '×'; 
    closeBtn.setAttribute('aria-label', 'Close toast');
    closeBtn.onclick = () => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (!toast.classList.contains('show')) {
                toast.remove();
            }
        });
    };

    toast.appendChild(messageSpan);
    toast.appendChild(closeBtn);

    if (container.firstChild) {
        container.insertBefore(toast, container.firstChild);
    } else {
        container.appendChild(toast);
    }

    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.classList.add('show');
        }, 10); 
    });

    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => {
                     if (!toast.classList.contains('show')) {
                        toast.remove();
                    }
                });
            }
        }, duration);
    }
};


// --- Confirmation Modal Logic ---
let globalConfirmCallback = null;
let globalCancelCallback = null;

/**
 * Displays a confirmation modal.
 * @param {string} message - The main message/question for the modal.
 * @param {string} title - The title of the modal.
 * @param {function} onConfirm - Callback function to execute if user confirms.
 * @param {function} [onCancel] - Optional callback function if user cancels.
 */
window.showConfirmationModal = function(message, title = "Confirm Action", onConfirm, onCancel = null) {
    const modalOverlay = document.getElementById('confirmationModal');
    const modalTitleEl = document.getElementById('modalTitle');
    const modalMessageEl = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirmBtn'); // Original button
    const cancelBtn = document.getElementById('modalCancelBtn');   // Original button

    if (!modalOverlay || !modalTitleEl || !modalMessageEl || !confirmBtn || !cancelBtn) {
        console.error("Confirmation Modal elements not found in HTML!");
        if (confirm(`${title}\n${message}`)) {
            if (typeof onConfirm === 'function') onConfirm();
        } else {
            if (typeof onCancel === 'function') onCancel();
        }
        return;
    }

    modalTitleEl.textContent = title;
    modalMessageEl.textContent = message;

    globalConfirmCallback = onConfirm;
    globalCancelCallback = onCancel;

    // Re-create buttons to clear old listeners effectively
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', handleModalConfirm);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener('click', handleModalCancel);

    modalOverlay.style.display = 'flex';
};

function handleModalConfirm() {
    if (typeof globalConfirmCallback === 'function') {
        globalConfirmCallback();
    }
    closeConfirmationModal();
}

function handleModalCancel() {
    if (typeof globalCancelCallback === 'function') {
        globalCancelCallback();
    }
    closeConfirmationModal();
}

function closeConfirmationModal() {
    const modalOverlay = document.getElementById('confirmationModal');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
    }
    globalConfirmCallback = null;
    globalCancelCallback = null;
}

// Optional: Close modal on ESC key press
document.addEventListener('keydown', function (event) {
    const modalOverlay = document.getElementById('confirmationModal');
    // Check if modalOverlay exists and is currently displayed
    if (event.key === 'Escape' && modalOverlay && modalOverlay.style.display === 'flex') {
        handleModalCancel(); // Call cancel handler to also trigger onCancel callback if any
    }
});


// --- Left Navigation Panel Toggle Logic ---
window.initializeLeftNavToggle = function() {
    const toggleBtn = document.getElementById('leftNavToggleBtn');
    const pageWrapper = document.querySelector('.page-wrapper');
    const leftNavPanel = document.querySelector('.left-nav-panel'); // Not strictly needed here but good to check
    const LS_COLLAPSED_KEY = 'evmProLeftNavCollapsed'; // Key for localStorage

    if (toggleBtn && pageWrapper && leftNavPanel) {
        console.log("[UI_UTILS] Initializing Left Nav Toggle.");
        // Apply initial state from localStorage
        if (localStorage.getItem(LS_COLLAPSED_KEY) === 'true') {
            pageWrapper.classList.add('left-nav-collapsed');
            // toggleBtn.innerHTML = '☰'; // Set to "open" icon
        } else {
            pageWrapper.classList.remove('left-nav-collapsed'); // Ensure it's not collapsed if not set or false
            // toggleBtn.innerHTML = '×'; // Set to "close" icon
        }

        toggleBtn.addEventListener('click', () => {
            pageWrapper.classList.toggle('left-nav-collapsed');
            const isCollapsed = pageWrapper.classList.contains('left-nav-collapsed');
            localStorage.setItem(LS_COLLAPSED_KEY, isCollapsed);
            
            // Optional: Change button icon based on state
            // if (isCollapsed) {
            //     toggleBtn.innerHTML = '☰'; // Hamburger icon (indicates panel is closed, click to open)
            // } else {
            //     toggleBtn.innerHTML = '×'; // 'X' or similar (indicates panel is open, click to close)
            // }

            // Optional: Dispatch a resize event for charts that might need to redraw
            // This can sometimes cause a flicker or be performance intensive if overused.
            // Test if your charts (especially ApexCharts) adjust correctly without this first.
            // If they don't, especially after panel expands, then enable it.
            // setTimeout(() => { // Add a small delay to allow transition to complete
            //     window.dispatchEvent(new Event('resize'));
            // }, 350); // Match CSS transition duration
            
            console.log(`[UI_UTILS] Left nav panel ${isCollapsed ? 'collapsed' : 'expanded'}`);
        });
    } else {
        if (!toggleBtn) console.warn("[UI_UTILS] Left Nav Toggle Button ('leftNavToggleBtn') not found.");
        if (!pageWrapper) console.warn("[UI_UTILS] Page Wrapper ('.page-wrapper') not found.");
        if (!leftNavPanel) console.warn("[UI_UTILS] Left Nav Panel ('.left-nav-panel') not found.");
    }
};

// --- General UI Initializations (can be called on DOMContentLoaded) ---
// If you want uiUtils to be self-initializing for some parts:
/*
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initializeLeftNavToggle === 'function') {
        window.initializeLeftNavToggle();
    }
    // Other general UI setups from uiUtils could go here
});
*/
// However, it's often cleaner to call specific initializers from your main index.html DOMContentLoaded
// to control the order of operations.