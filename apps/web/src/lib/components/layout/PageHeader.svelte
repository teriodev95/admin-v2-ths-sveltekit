<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
  }

  let { title, description = '', actions }: Props = $props();
</script>

<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">{title}</h1>
    {#if description}
      <p class="mt-1 text-sm text-ios-gray-500">{description}</p>
    {/if}
  </div>
  {#if actions}
    <div class="flex items-center gap-3">
      {@render actions()}
    </div>
  {/if}
</div>
