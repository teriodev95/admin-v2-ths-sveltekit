<script lang="ts">
  import { Check, ChevronsUpDown, Search, X } from "lucide-svelte";
  import { fade, fly } from "svelte/transition";

  interface Option {
    value: string | number;
    label: string;
  }

  interface Props {
    value?: string | number;
    options: Option[];
    placeholder?: string;
    label?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    onchange?: (value: string | number) => void;
  }

  let {
    value = $bindable(""),
    options = [],
    placeholder = "Seleccionar...",
    label = "",
    error = "",
    disabled = false,
    required = false,
    class: className = "",
    onchange,
  }: Props = $props();

  let isOpen = $state(false);
  let searchQuery = $state("");
  let triggerElement: HTMLElement;

  const filteredOptions = $derived(
    searchQuery
      ? options.filter((opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options
  );

  const selectedOption = $derived(options.find((opt) => opt.value === value));

  function selectOption(opt: Option) {
    value = opt.value;
    isOpen = false;
    searchQuery = "";
    onchange?.(value);
  }

  function clearSelection(e: Event) {
    e.stopPropagation();
    value = "";
    onchange?.("");
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      isOpen = false;
    }
  }

  const uniqueId = Math.random().toString(36).substring(2);

  function toggleOpen() {
    if (!disabled) {
      isOpen = !isOpen;
      if (isOpen) {
        // Focus search input on open
        setTimeout(() => {
          const searchInput = document.getElementById(
            `combobox-search-${uniqueId}`
          );
          searchInput?.focus();
        }, 50);
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="w-full {className} relative">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {#if required}<span class="text-ios-red">*</span>{/if}
    </label>
  {/if}

  <!-- Trigger -->
  <button
    type="button"
    bind:this={triggerElement}
    onclick={toggleOpen}
    {disabled}
    class="w-full px-4 py-3 bg-white border rounded-ios text-sm text-left flex items-center justify-between
           focus:outline-none focus:ring-2 focus:ring-ios-blue/20 focus:border-ios-blue
           transition-all duration-200 disabled:bg-ios-gray-100 disabled:cursor-not-allowed
           {error
      ? 'border-ios-red focus:ring-ios-red/20 focus:border-ios-red'
      : 'border-ios-gray-200'}"
  >
    <span class={!selectedOption ? "text-gray-500" : "text-gray-900"}>
      {selectedOption?.label || placeholder}
    </span>
    <div class="flex items-center gap-2">
      {#if selectedOption && !required && !disabled}
        <div
          role="button"
          tabindex="0"
          onclick={clearSelection}
          onkeydown={(e) => e.key === "Enter" && clearSelection(e)}
          class="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={14} />
        </div>
      {/if}
      <ChevronsUpDown size={16} class="text-gray-400" />
    </div>
  </button>

  {#if error}
    <p class="mt-1.5 text-xs text-ios-red">{error}</p>
  {/if}

  <!-- Dropdown -->
  {#if isOpen}
    <div
      class="absolute z-50 left-0 right-0 mt-1 bg-white border border-ios-gray-200
             rounded-ios-lg shadow-ios-lg overflow-hidden flex flex-col max-h-60"
      transition:fly={{ y: -5, duration: 200 }}
    >
      <!-- Search -->
      <div class="p-2 border-b border-ios-gray-100 sticky top-0 bg-white z-10">
        <div class="relative">
          <Search
            size={16}
            class="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray-400"
          />
          <input
            id={`combobox-search-${uniqueId}`}
            type="text"
            placeholder="Buscar..."
            bind:value={searchQuery}
            onclick={(e) => e.stopPropagation()}
            class="w-full pl-9 pr-3 py-2 bg-ios-gray-50 border-none rounded-ios text-sm
                   placeholder:text-ios-gray-400 focus:outline-none focus:ring-2 focus:ring-ios-blue/20"
          />
        </div>
      </div>

      <!-- Options -->
      <div class="overflow-y-auto flex-1">
        {#if filteredOptions.length === 0}
          <div class="px-4 py-3 text-sm text-ios-gray-500 text-center">
            No se encontraron resultados
          </div>
        {:else}
          {#each filteredOptions as option (option.value)}
            <button
              type="button"
              onclick={() => selectOption(option)}
              class="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-ios-gray-50
                     transition-colors {value === option.value
                ? 'bg-ios-blue/5 text-ios-blue'
                : 'text-gray-900'}"
            >
              <span class="truncate">{option.label}</span>
              {#if value === option.value}
                <Check size={16} class="text-ios-blue flex-shrink-0" />
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-40"
      onclick={() => (isOpen = false)}
      aria-hidden="true"
    ></div>
  {/if}
</div>
