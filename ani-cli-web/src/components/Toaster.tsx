import { useToastStore, type ToastType } from '../lib/toast';

const styles: Record<ToastType, string> = {
  success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100',
  error: 'border-red-400/30 bg-red-500/15 text-red-100',
  info: 'border-white/15 bg-white/10 text-neutral-100',
};

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[300] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-left text-sm shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform hover:scale-[1.02] ${styles[toast.type]}`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
