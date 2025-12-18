<script lang="ts">
  interface Props {
    type?: 'text' | 'email' | 'password' | 'number' | 'search';
    value?: string | number;
    placeholder?: string;
    label?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
  }

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    label = '',
    error = '',
    disabled = false,
    required = false,
    class: className = '',
    oninput,
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
  <input
    {type}
    bind:value
    {placeholder}
    {disabled}
    {required}
    {oninput}
    {onchange}
    class="w-full px-4 py-3 bg-white border rounded-ios text-sm
           placeholder:text-ios-gray-500 focus:outline-none focus:ring-2 focus:ring-ios-blue/20 focus:border-ios-blue
           transition-all duration-200 disabled:bg-ios-gray-100 disabled:cursor-not-allowed
           {error ? 'border-ios-red focus:ring-ios-red/20 focus:border-ios-red' : 'border-ios-gray-200'}"
  />
  {#if error}
    <p class="mt-1.5 text-xs text-ios-red">{error}</p>
  {/if}
</div>
