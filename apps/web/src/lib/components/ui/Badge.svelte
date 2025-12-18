<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    class?: string;
    children: Snippet;
  }

  let {
    variant = 'default',
    size = 'md',
    class: className = '',
    children
  }: Props = $props();

  const variants = {
    default: 'bg-ios-gray-200 text-ios-gray-700',
    success: 'bg-ios-green/15 text-ios-green',
    warning: 'bg-ios-orange/15 text-ios-orange',
    danger: 'bg-ios-red/15 text-ios-red',
    info: 'bg-ios-blue/15 text-ios-blue'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  };
</script>

<span class="inline-flex items-center font-medium rounded-full {variants[variant]} {sizes[size]} {className}">
  {@render children()}
</span>
