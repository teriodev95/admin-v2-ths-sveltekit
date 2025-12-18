<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from 'lucide-svelte';

  interface Props {
    open: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let {
    open = $bindable(false),
    title = '',
    size = 'md',
    onclose,
    children,
    footer
  }: Props = $props();

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
  >
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true"></div>

    <div
      class="relative bg-white rounded-ios-xl shadow-ios-lg w-full {sizes[size]}
             transform transition-all duration-200 animate-in fade-in zoom-in-95"
    >
      {#if title}
        <div class="flex items-center justify-between px-6 py-4 border-b border-ios-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onclick={onclose}
            class="p-1.5 rounded-ios text-ios-gray-500 hover:bg-ios-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      {/if}

      <div class="px-6 py-4 max-h-[70vh] overflow-y-auto">
        {@render children()}
      </div>

      {#if footer}
        <div class="px-6 py-4 border-t border-ios-gray-200 bg-ios-gray-50 rounded-b-ios-xl">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes zoom-in-95 {
    from { transform: scale(0.95); }
    to { transform: scale(1); }
  }

  .animate-in {
    animation: fade-in 0.2s ease-out, zoom-in-95 0.2s ease-out;
  }
</style>
