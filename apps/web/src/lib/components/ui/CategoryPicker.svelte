<script lang="ts">
  import type { Category } from '$lib/types';
  import { X, Check, ChevronRight, Search } from 'lucide-svelte';

  interface Props {
    categories: Category[];
    selected?: number[];
    label?: string;
    onchange?: (ids: number[]) => void;
  }

  let {
    categories = [],
    selected = $bindable([]),
    label = 'Categorias',
    onchange
  }: Props = $props();

  let isOpen = $state(false);
  let searchQuery = $state('');

  // Flatten categories for search
  function flattenCategories(cats: Category[], parentPath = ''): (Category & { path: string })[] {
    let result: (Category & { path: string })[] = [];
    for (const cat of cats) {
      const path = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
      result.push({ ...cat, path });
      if (cat.children && cat.children.length > 0) {
        result = [...result, ...flattenCategories(cat.children, path)];
      }
    }
    return result;
  }

  const flatCategories = $derived(flattenCategories(categories));

  const filteredCategories = $derived(
    searchQuery
      ? flatCategories.filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.path.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : flatCategories
  );

  const selectedCategories = $derived(
    flatCategories.filter((c) => selected.includes(c.id))
  );

  function toggleCategory(id: number) {
    if (selected.includes(id)) {
      selected = selected.filter((s) => s !== id);
    } else {
      selected = [...selected, id];
    }
    onchange?.(selected);
  }

  function removeCategory(id: number) {
    selected = selected.filter((s) => s !== id);
    onchange?.(selected);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="w-full">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
    </label>
  {/if}

  <!-- Selected chips -->
  <div
    class="min-h-[48px] p-2 bg-white border border-ios-gray-200 rounded-ios cursor-pointer
           focus-within:ring-2 focus-within:ring-ios-blue/20 focus-within:border-ios-blue
           transition-all duration-200"
    onclick={() => (isOpen = !isOpen)}
    onkeydown={(e) => e.key === 'Enter' && (isOpen = !isOpen)}
    role="combobox"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    tabindex="0"
  >
    {#if selectedCategories.length === 0}
      <span class="text-sm text-ios-gray-500 px-2 py-1">
        Seleccionar categorias...
      </span>
    {:else}
      <div class="flex flex-wrap gap-1.5">
        {#each selectedCategories as cat (cat.id)}
          <span
            class="inline-flex items-center gap-1 px-2.5 py-1 bg-ios-blue/10 text-ios-blue
                   text-xs font-medium rounded-full"
          >
            {cat.name}
            <button
              type="button"
              onclick={(e) => {
                e.stopPropagation();
                removeCategory(cat.id);
              }}
              class="hover:bg-ios-blue/20 rounded-full p-0.5 transition-colors"
              aria-label="Quitar {cat.name}"
            >
              <X size={12} />
            </button>
          </span>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Dropdown -->
  {#if isOpen}
    <div class="relative">
      <div
        class="absolute z-50 top-1 left-0 right-0 bg-white border border-ios-gray-200
               rounded-ios-lg shadow-ios-lg max-h-72 overflow-hidden"
      >
        <!-- Search -->
        <div class="p-2 border-b border-ios-gray-100">
          <div class="relative">
            <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray-400" />
            <input
              type="text"
              placeholder="Buscar categoria..."
              bind:value={searchQuery}
              onclick={(e) => e.stopPropagation()}
              class="w-full pl-9 pr-3 py-2 bg-ios-gray-50 border-none rounded-ios text-sm
                     placeholder:text-ios-gray-400 focus:outline-none focus:ring-2 focus:ring-ios-blue/20"
            />
          </div>
        </div>

        <!-- Options -->
        <div class="overflow-y-auto max-h-52">
          {#if filteredCategories.length === 0}
            <div class="px-4 py-3 text-sm text-ios-gray-500 text-center">
              No se encontraron categorias
            </div>
          {:else}
            {#each filteredCategories as cat (cat.id)}
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  toggleCategory(cat.id);
                }}
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-ios-gray-50
                       transition-colors {selected.includes(cat.id) ? 'bg-ios-blue/5' : ''}"
              >
                <div
                  class="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors
                         {selected.includes(cat.id)
                           ? 'bg-ios-blue text-white'
                           : 'border-2 border-ios-gray-300'}"
                >
                  {#if selected.includes(cat.id)}
                    <Check size={14} />
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
                  {#if cat.path !== cat.name}
                    <p class="text-xs text-ios-gray-500 truncate">{cat.path}</p>
                  {/if}
                </div>
              </button>
            {/each}
          {/if}
        </div>

        <!-- Footer -->
        <div class="p-2 border-t border-ios-gray-100 bg-ios-gray-50">
          <button
            type="button"
            onclick={(e) => {
              e.stopPropagation();
              isOpen = false;
            }}
            class="w-full px-3 py-2 bg-ios-blue text-white text-sm font-medium rounded-ios
                   hover:bg-ios-blue/90 transition-colors"
          >
            Listo ({selected.length} seleccionadas)
          </button>
        </div>
      </div>

      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-40"
        onclick={() => (isOpen = false)}
        aria-hidden="true"
      ></div>
    </div>
  {/if}
</div>
