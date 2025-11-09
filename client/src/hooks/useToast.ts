import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    sonnerToast.success(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 3000,
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    sonnerToast.error(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 5000,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    sonnerToast.info(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 3000,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    sonnerToast.warning(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 4000,
    });
  };

  const loading = (message: string, options?: ToastOptions) => {
    return sonnerToast.loading(options?.title || message, {
      description: options?.description,
    });
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  };

  return {
    success,
    error,
    info,
    warning,
    loading,
    promise,
    dismiss: sonnerToast.dismiss,
  };
}
