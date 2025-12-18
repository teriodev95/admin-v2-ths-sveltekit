<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children: Snippet;
    header?: Snippet;
    footer?: Snippet;
  }

  let {
    class: className = '',
    padding = 'md',
    children,
    header,
    footer
  }: Props = $props();

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };
</script>

<div class="bg-white rounded-ios-lg shadow-ios overflow-hidden {className}">
  {#if header}
    <div class="px-4 py-3 border-b border-ios-gray-200 bg-ios-gray-50">
      {@render header()}
    </div>
  {/if}

  <div class={paddings[padding]}>
    {@render children()}
  </div>

  {#if footer}
    <div class="px-4 py-3 border-t border-ios-gray-200 bg-ios-gray-50">
      {@render footer()}
    </div>
  {/if}
</div>
