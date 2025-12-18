<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Package } from 'lucide-svelte';

  interface Props {
    title?: string;
    description?: string;
    icon?: typeof Package;
    action?: Snippet;
  }

  let {
    title = 'Sin datos',
    description = 'No hay elementos para mostrar',
    icon: Icon = Package,
    action
  }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center">
  <div class="p-4 rounded-full bg-ios-gray-100 mb-4">
    <svelte:component this={Icon} size={32} class="text-ios-gray-400" />
  </div>
  <h3 class="text-lg font-medium text-gray-900 mb-1">{title}</h3>
  <p class="text-sm text-ios-gray-500 mb-4 max-w-sm">{description}</p>
  {#if action}
    {@render action()}
  {/if}
</div>
