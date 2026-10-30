/**
 * Global toast notification system to replace window.alert
 * and provide clean in-app feedback compliant with iframe constraints.
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export function showToast(message: string, type: ToastType = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('giva:toast', {
        detail: {
          id: Math.random().toString(36).substring(2, 9),
          message,
          type,
        },
      })
    );
  }
}

// Intercept window.alert inside the applet to prevent iframe lockups
if (typeof window !== 'undefined') {
  window.alert = (msg: any) => {
    showToast(String(msg), 'warning');
  };
}
