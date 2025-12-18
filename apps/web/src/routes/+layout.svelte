<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';
  import { Menu } from 'lucide-svelte';
  import '../app.css';

  let { children } = $props();
  let sidebarOpen = $state(false);

  const publicRoutes = ['/login'];

  onMount(() => {
    auth.init();
  });

  $effect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !publicRoutes.includes($page.url.pathname)) {
      goto('/login');
    }
  });

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  const isPublicRoute = $derived(publicRoutes.includes($page.url.pathname));
</script>

<svelte:head>
  <title>THS Admin</title>
  <meta name="description" content="Panel de administracion THS" />
</svelte:head>

{#if auth.isLoading && !isPublicRoute}
  <div class="min-h-screen flex items-center justify-center bg-ios-gray-100">
    <Spinner size="lg" />
  </div>
{:else if isPublicRoute}
  {@render children()}
{:else if auth.isAuthenticated}
  <div class="min-h-screen bg-ios-gray-100">
    <Sidebar open={sidebarOpen} onclose={closeSidebar} />

    <!-- Mobile header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-xl border-b border-ios-gray-200 z-30 flex items-center px-4">
      <button
        onclick={toggleSidebar}
        class="p-2 rounded-ios hover:bg-ios-gray-100 transition-colors"
      >
        <Menu size={24} class="text-gray-700" />
      </button>
      <span class="ml-3 font-semibold text-gray-900">THS Admin</span>
    </div>

    <!-- Main content -->
    <main class="lg:ml-[280px] min-h-screen pt-14 lg:pt-0">
      <div class="p-4 sm:p-6 lg:p-8">
        {@render children()}
      </div>
    </main>
  </div>
  <Toast />
{/if}
