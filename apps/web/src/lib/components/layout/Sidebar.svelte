<script lang="ts">
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth.svelte';
  import {
    LayoutDashboard,
    Package,
    Tag,
    FolderTree,
    LogOut,
    Menu,
    X
  } from 'lucide-svelte';

  interface Props {
    open?: boolean;
    onclose?: () => void;
  }

  let { open = true, onclose }: Props = $props();

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/products', label: 'Productos', icon: Package },
    { href: '/brands', label: 'Marcas', icon: Tag },
    { href: '/categories', label: 'Categorias', icon: FolderTree }
  ];

  function isActive(href: string) {
    if (href === '/') return $page.url.pathname === '/';
    return $page.url.pathname.startsWith(href);
  }

  function handleLogout() {
    auth.logout();
  }
</script>

<!-- Mobile backdrop -->
{#if open}
  <div
    class="fixed inset-0 bg-black/40 z-40 lg:hidden"
    onclick={onclose}
    role="button"
    tabindex="-1"
    aria-label="Cerrar menu"
  ></div>
{/if}

<!-- Sidebar -->
<aside
  class="fixed top-0 left-0 h-full bg-white/90 backdrop-blur-xl border-r border-ios-gray-200
         w-[280px] z-50 flex flex-col transition-transform duration-300
         {open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
>
  <!-- Header -->
  <div class="flex items-center justify-between px-6 py-5 border-b border-ios-gray-200">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-ios-lg bg-ios-blue flex items-center justify-center">
        <span class="text-white font-bold text-lg">T</span>
      </div>
      <div>
        <h1 class="font-semibold text-gray-900">THS Admin</h1>
        <p class="text-xs text-ios-gray-500">Panel de control</p>
      </div>
    </div>
    <button class="lg:hidden p-2 rounded-ios hover:bg-ios-gray-100" onclick={onclose}>
      <X size={20} class="text-ios-gray-500" />
    </button>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
    {#each links as link}
      <a
        href={link.href}
        onclick={onclose}
        class="flex items-center gap-3 px-4 py-2.5 rounded-ios text-sm font-medium transition-colors duration-150
               {isActive(link.href)
                 ? 'bg-ios-blue/10 text-ios-blue'
                 : 'text-gray-600 hover:bg-ios-gray-100'}"
      >
        <svelte:component this={link.icon} size={20} />
        {link.label}
      </a>
    {/each}
  </nav>

  <!-- User section -->
  <div class="px-4 py-4 border-t border-ios-gray-200">
    {#if auth.user}
      <div class="flex items-center gap-3 px-4 py-2 mb-2">
        <div class="w-8 h-8 rounded-full bg-ios-gray-200 flex items-center justify-center">
          <span class="text-sm font-medium text-ios-gray-600">
            {auth.user.name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">{auth.user.name}</p>
          <p class="text-xs text-ios-gray-500 truncate">{auth.user.email}</p>
        </div>
      </div>
    {/if}
    <button
      onclick={handleLogout}
      class="flex items-center gap-3 w-full px-4 py-2.5 rounded-ios text-sm font-medium
             text-ios-red hover:bg-ios-red/10 transition-colors duration-150"
    >
      <LogOut size={20} />
      Cerrar sesion
    </button>
  </div>
</aside>
