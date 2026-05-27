/**
 * Custom Alert, Confirm and Toast library for Ctrl + Fit
 * Replaces native browser dialogs with premium, high-contrast, theme-matching UI.
 */

// Helper to load styles dynamically if needed, but Tailwind classes will work out of the box.
const getIconSvg = (type: 'success' | 'error' | 'warning' | 'info' | 'question') => {
  switch (type) {
    case 'success':
      return `
        <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mb-2">
          <svg class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      `;
    case 'error':
      return `
        <div class="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 mb-2">
          <svg class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      `;
    case 'warning':
      return `
        <div class="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0 mb-2">
          <svg class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      `;
    case 'question':
      return `
        <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mb-2">
          <svg class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      `;
    case 'info':
    default:
      return `
        <div class="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mb-2">
          <svg class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      `;
  }
};

/**
 * Shows a custom styled Alert dialog.
 * @param message The alert message
 * @param title The title of the alert dialog (optional)
 * @param type The type of alert: 'success', 'error', 'warning', 'info'
 */
export function showAlert(
  message: string,
  title: string = 'Atención',
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
): Promise<void> {
  return new Promise((resolve) => {
    // Create elements
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm opacity-0 transition-opacity duration-200';
    
    const card = document.createElement('div');
    card.className = 'bg-zinc-950 border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center space-y-4 transform scale-95 opacity-0 transition-all duration-200';
    
    const iconHtml = getIconSvg(type);
    
    card.innerHTML = `
      ${iconHtml}
      <div class="space-y-1.5 w-full">
        <h3 class="text-lg font-bold font-heading text-white leading-tight">${title}</h3>
        <p class="text-sm text-gray-400 font-body leading-relaxed break-words">${message}</p>
      </div>
      <button id="custom-alert-btn" class="w-full bg-primary text-black font-extrabold h-11 rounded-md hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer text-sm tracking-wide">
        ACEPTAR
      </button>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      card.classList.remove('scale-95', 'opacity-0');
    });
    
    // Close function
    const closeAlert = () => {
      overlay.classList.add('opacity-0');
      card.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve();
      }, 200);
    };
    
    // Event listeners
    const button = card.querySelector('#custom-alert-btn') as HTMLButtonElement;
    button.addEventListener('click', closeAlert);
    
    // Close on ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', handleKeyDown);
        closeAlert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
  });
}

/**
 * Shows a custom styled Confirm dialog.
 * @param message The confirmation message
 * @param title The title of the confirmation dialog (optional)
 * @param type The type of dialog: 'warning', 'question', 'danger'
 * @param confirmText Text for the confirm button
 * @param cancelText Text for the cancel button
 */
export function showConfirm(
  message: string,
  title: string = 'Confirmar Acción',
  type: 'warning' | 'question' | 'danger' = 'question',
  confirmText: string = 'CONFIRMAR',
  cancelText: string = 'CANCELAR'
): Promise<boolean> {
  return new Promise((resolve) => {
    // Create elements
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm opacity-0 transition-opacity duration-200';
    
    const card = document.createElement('div');
    card.className = 'bg-zinc-950 border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center space-y-4 transform scale-95 opacity-0 transition-all duration-200';
    
    const iconType = type === 'danger' ? 'error' : type;
    const iconHtml = getIconSvg(iconType);
    
    const isDestructive = type === 'danger' || type === 'warning';
    const confirmBtnClass = isDestructive 
      ? 'bg-red-600 hover:bg-red-700 text-white' 
      : 'bg-primary text-black hover:bg-primary/90';
      
    card.innerHTML = `
      ${iconHtml}
      <div class="space-y-1.5 w-full">
        <h3 class="text-lg font-bold font-heading text-white leading-tight">${title}</h3>
        <p class="text-sm text-gray-400 font-body leading-relaxed break-words">${message}</p>
      </div>
      <div class="flex gap-3 w-full pt-1">
        <button id="custom-confirm-cancel" class="flex-1 bg-white/5 border border-white/10 text-gray-300 font-bold h-11 rounded-md hover:bg-white/10 transition-all active:scale-[0.98] cursor-pointer text-xs tracking-wide">
          ${cancelText}
        </button>
        <button id="custom-confirm-ok" class="flex-1 ${confirmBtnClass} font-extrabold h-11 rounded-md transition-all active:scale-[0.98] cursor-pointer text-xs tracking-wide">
          ${confirmText}
        </button>
      </div>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      card.classList.remove('scale-95', 'opacity-0');
    });
    
    // Close function
    const closeConfirm = (result: boolean) => {
      overlay.classList.add('opacity-0');
      card.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve(result);
      }, 200);
    };
    
    // Event listeners
    const okBtn = card.querySelector('#custom-confirm-ok') as HTMLButtonElement;
    const cancelBtn = card.querySelector('#custom-confirm-cancel') as HTMLButtonElement;
    
    okBtn.addEventListener('click', () => {
      window.removeEventListener('keydown', handleKeyDown);
      closeConfirm(true);
    });
    cancelBtn.addEventListener('click', () => {
      window.removeEventListener('keydown', handleKeyDown);
      closeConfirm(false);
    });
    
    // Close on ESC key / Enter key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', handleKeyDown);
        closeConfirm(false);
      } else if (e.key === 'Enter') {
        // Trigger OK on Enter
        window.removeEventListener('keydown', handleKeyDown);
        closeConfirm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
  });
}

/**
 * Toast Container reference
 */
let toastContainer: HTMLDivElement | null = null;

const createToastContainer = () => {
  toastContainer = document.createElement('div');
  toastContainer.className = 'fixed bottom-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4';
  document.body.appendChild(toastContainer);
  return toastContainer;
};

/**
 * Shows a premium toast notification.
 * @param message The message to show in the toast
 * @param type The type of toast: 'success', 'error', 'info'
 * @param duration Duration in milliseconds (default 3500)
 */
export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'success',
  duration: number = 3500
): void {
  if (typeof window === 'undefined') return;

  const container = toastContainer || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = 'bg-zinc-950 border border-white/10 rounded-lg p-4 shadow-xl flex items-center gap-3 transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto select-none';
  
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `
      <svg class="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
  } else if (type === 'error') {
    iconHtml = `
      <svg class="h-5 w-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
  } else {
    iconHtml = `
      <svg class="h-5 w-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
  }

  toast.innerHTML = `
    ${iconHtml}
    <p class="text-xs font-semibold text-white leading-snug flex-1">${message}</p>
    <button class="text-gray-500 hover:text-white transition-colors ml-1 cursor-pointer shrink-0">
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });
  
  // Close handler
  const dismissToast = () => {
    toast.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
      if (container.children.length === 0 && toastContainer) {
        document.body.removeChild(container);
        toastContainer = null;
      }
    }, 300);
  };
  
  // Click close button
  const closeBtn = toast.querySelector('button') as HTMLButtonElement;
  closeBtn.addEventListener('click', dismissToast);
  
  // Auto dismiss
  const timer = setTimeout(dismissToast, duration);
  
  // Pause on hover
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
}
