<script lang="ts">
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
    onchange?: (e: Event) => void;
  }

  let {
    value = $bindable(''),
    options = [],
    placeholder = 'Seleccionar...',
    label = '',
    error = '',
    disabled = false,
    required = false,
    class: className = '',
    onchange
  }: Props = $props();
</script>

<div class="w-full {className}">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {#if required}<span class="text-ios-red">*</span>{/if}
    </label>
  {/if}
  <select
    bind:value
    {disabled}
    {required}
    {onchange}
    class="w-full px-4 py-3 bg-white border rounded-ios text-sm
           focus:outline-none focus:ring-2 focus:ring-ios-blue/20 focus:border-ios-blue
           transition-all duration-200 disabled:bg-ios-gray-100 disabled:cursor-not-allowed
           appearance-none cursor-pointer
           {error ? 'border-ios-red focus:ring-ios-red/20 focus:border-ios-red' : 'border-ios-gray-200'}"
    style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%236b7280%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E');
            background-repeat: no-repeat;
            background-position: right 0.75rem center;
            background-size: 1.25rem;"
  >
    {#if placeholder}
      <option value="" disabled>{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  {#if error}
    <p class="mt-1.5 text-xs text-ios-red">{error}</p>
  {/if}
</div>
