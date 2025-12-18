<script lang="ts">
  import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-svelte';

  interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  }

  let toasts = $state<Toast[]>([]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: AlertCircle
  };

  const colors = {
    success: 'bg-ios-green text-white',
    error: 'bg-ios-red text-white',
    info: 'bg-ios-blue text-white'
  };

  export function show(type: Toast['type'], message: string, duration = 3000) {
    const id = crypto.randomUUID();
    toasts = [...toasts, { id, type, message }];

    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, duration);
  }

  function dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
  }
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
  {#each toasts as toast (toast.id)}
    <div
      class="flex items-center gap-3 px-4 py-3 rounded-ios-lg shadow-ios-lg {colors[toast.type]}
             animate-slide-in"
    >
      <svelte:component this={icons[toast.type]} size={20} />
      <span class="text-sm font-medium">{toast.message}</span>
      <button onclick={() => dismiss(toast.id)} class="ml-2 opacity-80 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  {/each}
</div>

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>
