<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    onclick?: () => void;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    class: className = '',
    onclick,
    children
  }: Props = $props();

  const variants = {
    primary: 'bg-ios-blue text-white hover:bg-ios-blue/90',
    secondary: 'bg-ios-gray-200 text-gray-900 hover:bg-ios-gray-300',
    danger: 'bg-ios-red text-white hover:bg-ios-red/90',
    ghost: 'bg-transparent text-ios-blue hover:bg-ios-blue/10'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };
</script>

<button
  {type}
  disabled={disabled || loading}
  onclick={onclick}
  class="inline-flex items-center justify-center gap-2 rounded-ios font-medium
         transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
         {variants[variant]} {sizes[size]} {className}"
>
  {#if loading}
    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  {@render children()}
</button>
