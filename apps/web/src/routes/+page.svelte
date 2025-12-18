<script lang="ts">
  import { onMount } from 'svelte';
  import { getProducts, getBrands, getCategories } from '$lib/services/api';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';
  import { Package, Tag, FolderTree } from 'lucide-svelte';

  let loading = $state(true);
  let stats = $state({
    products: 0,
    brands: 0,
    categories: 0
  });

  onMount(async () => {
    try {
      const [productsRes, brandsRes, categoriesRes] = await Promise.all([
        getProducts(),
        getBrands(),
        getCategories(true)
      ]);

      stats = {
        products: productsRes.data?.length || 0,
        brands: brandsRes.data?.length || 0,
        categories: categoriesRes.data?.length || 0
      };
    } catch (e) {
      console.error('Error cargando stats:', e);
    } finally {
      loading = false;
    }
  });

  const cards = $derived([
    {
      title: 'Productos',
      value: stats.products,
      icon: Package,
      color: 'bg-ios-blue',
      href: '/products'
    },
    {
      title: 'Marcas',
      value: stats.brands,
      icon: Tag,
      color: 'bg-ios-green',
      href: '/brands'
    },
    {
      title: 'Categorias',
      value: stats.categories,
      icon: FolderTree,
      color: 'bg-ios-orange',
      href: '/categories'
    }
  ]);
</script>

<PageHeader
  title="Dashboard"
  description="Resumen general del sistema"
/>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
    {#each cards as card}
      <a href={card.href} class="block group">
        <Card class="hover:shadow-ios-md transition-shadow duration-200">
          <div class="flex items-center gap-4">
            <div class="{card.color} p-3 rounded-ios-lg">
              <svelte:component this={card.icon} size={24} class="text-white" />
            </div>
            <div>
              <p class="text-sm text-ios-gray-500">{card.title}</p>
              <p class="text-2xl font-semibold text-gray-900">{card.value.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </a>
    {/each}
  </div>

  <!-- Quick actions -->
  <Card>
    {#snippet header()}
      <h2 class="font-semibold text-gray-900">Acciones rapidas</h2>
    {/snippet}

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <a
        href="/products"
        class="flex items-center gap-3 p-4 rounded-ios bg-ios-gray-50 hover:bg-ios-gray-100 transition-colors"
      >
        <Package size={20} class="text-ios-blue" />
        <span class="text-sm font-medium text-gray-700">Ver productos</span>
      </a>
      <a
        href="/brands"
        class="flex items-center gap-3 p-4 rounded-ios bg-ios-gray-50 hover:bg-ios-gray-100 transition-colors"
      >
        <Tag size={20} class="text-ios-green" />
        <span class="text-sm font-medium text-gray-700">Gestionar marcas</span>
      </a>
      <a
        href="/categories"
        class="flex items-center gap-3 p-4 rounded-ios bg-ios-gray-50 hover:bg-ios-gray-100 transition-colors"
      >
        <FolderTree size={20} class="text-ios-orange" />
        <span class="text-sm font-medium text-gray-700">Gestionar categorias</span>
      </a>
    </div>
  </Card>
{/if}
