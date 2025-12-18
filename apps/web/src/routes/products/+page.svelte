<script lang="ts">
  import { onMount } from 'svelte';
  import type { Product, Brand, Category } from '$lib/types';
  import {
    getProduct,
    searchProducts,
    updateProduct,
    getBrands,
    getCategories
  } from '$lib/services/api';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import CategoryPicker from '$lib/components/ui/CategoryPicker.svelte';
  import {
    Search,
    Pencil,
    Package,
    ChevronLeft,
    ChevronRight,
    Tag,
    FolderTree
  } from 'lucide-svelte';

  let products = $state<Product[]>([]);
  let brands = $state<Brand[]>([]);
  let categories = $state<Category[]>([]);
  let treeCategories = $state<Category[]>([]);
  let loading = $state(true);
  let showModal = $state(false);
  let editingProduct = $state<Product | null>(null);
  let saving = $state(false);
  let loadingProduct = $state(false);

  // Search & pagination
  let searchQuery = $state('');
  let currentPage = $state(1);
  let totalProducts = $state(0);
  const pageSize = 20;

  // Form state
  let formName = $state('');
  let formSalePrice = $state(0);
  let formStockQuantity = $state(0);
  let formBrandId = $state<number | ''>('');
  let formCategoryIds = $state<number[]>([]);
  let formEnMercadolibre = $state(0);
  let formError = $state('');

  onMount(async () => {
    await Promise.all([loadProducts(), loadFilters()]);
  });

  async function loadProducts() {
    loading = true;
    try {
      const params: Parameters<typeof searchProducts>[0] = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      };

      // Búsqueda general (nombre O barcode)
      if (searchQuery) {
        params.query = searchQuery;
      }

      const res = await searchProducts(params);

      if (res.success && res.data) {
        products = res.data;
        totalProducts = res.total || res.data.length;
      }
    } catch (e) {
      console.error('Error cargando productos:', e);
    } finally {
      loading = false;
    }
  }

  async function loadFilters() {
    try {
      const [brandsRes, flatCategoriesRes, treeCategoriesRes] = await Promise.all([
        getBrands(),
        getCategories(true),
        getCategories(false)
      ]);

      if (brandsRes.success && brandsRes.data) brands = brandsRes.data;
      if (flatCategoriesRes.success && flatCategoriesRes.data) categories = flatCategoriesRes.data;
      if (treeCategoriesRes.success && treeCategoriesRes.data) treeCategories = treeCategoriesRes.data;
    } catch (e) {
      console.error('Error cargando filtros:', e);
    }
  }

  function handleSearch() {
    currentPage = 1;
    loadProducts();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  function goToPage(page: number) {
    currentPage = page;
    loadProducts();
  }

  async function openEditModal(product: Product) {
    editingProduct = product;
    formName = product.name;
    formSalePrice = product.salePrice;
    formStockQuantity = product.stockQuantity;
    formBrandId = product.brandId || '';
    formCategoryIds = [];
    formEnMercadolibre = product.enMercadolibre;
    formError = '';
    showModal = true;

    // Load product details with categories
    loadingProduct = true;
    try {
      const res = await getProduct(product.id);
      if (res.success && res.data) {
        const cats = res.data.categories;
        if (Array.isArray(cats)) {
          formCategoryIds = cats.map((c: any) => (typeof c === 'number' ? c : c.id));
        }
      }
    } catch (e) {
      console.error('Error cargando producto:', e);
    } finally {
      loadingProduct = false;
    }
  }

  function closeModal() {
    showModal = false;
    editingProduct = null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';

    if (!formName.trim()) {
      formError = 'El nombre es requerido';
      return;
    }

    if (!editingProduct) return;

    saving = true;

    try {
      const res = await updateProduct(editingProduct.id, {
        name: formName,
        salePrice: formSalePrice,
        stockQuantity: formStockQuantity,
        brandId: formBrandId || null,
        categoryIds: formCategoryIds
      } as Partial<Product> & { categoryIds?: number[] });

      if (!res.success) {
        formError = res.error || 'Error al actualizar';
        saving = false;
        return;
      }

      closeModal();
      await loadProducts();
    } catch (e) {
      formError = 'Error de conexion';
    } finally {
      saving = false;
    }
  }

  async function toggleMercadolibre(product: Product) {
    const newValue = product.enMercadolibre ? 0 : 1;
    try {
      await updateProduct(product.id, { enMercadolibre: newValue } as Partial<Product>);
      await loadProducts();
    } catch (e) {
      console.error('Error actualizando:', e);
    }
  }

  // Helper to get brand name by ID
  function getBrandById(brandId: number | null): Brand | undefined {
    if (!brandId) return undefined;
    return brands.find((b) => b.id === brandId);
  }

  // Helper to get category names from product categories array
  function getProductCategoryNames(productCategories: number[] | Category[]): string[] {
    if (!Array.isArray(productCategories) || productCategories.length === 0) return [];

    return productCategories.map((cat) => {
      if (typeof cat === 'number') {
        const found = categories.find((c) => c.id === cat);
        return found?.name || '';
      }
      return cat.name;
    }).filter(Boolean);
  }

  const totalPages = $derived(Math.ceil(totalProducts / pageSize));
  const brandOptions = $derived(brands.map((b) => ({ value: b.id, label: b.name })));
</script>

<PageHeader title="Productos" description="Gestiona el catalogo de productos" />

<!-- Search bar - always visible -->
<Card class="mb-6">
  <div class="flex gap-3">
    <div class="relative flex-1">
      <Search size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-ios-gray-400" />
      <input
        type="text"
        placeholder="Buscar por nombre o codigo de barras..."
        bind:value={searchQuery}
        onkeydown={handleKeydown}
        class="w-full pl-11 pr-4 py-3 bg-ios-gray-50 border border-ios-gray-200 rounded-ios text-sm
               placeholder:text-ios-gray-500 focus:outline-none focus:ring-2 focus:ring-ios-blue/20 focus:border-ios-blue
               transition-all duration-200"
      />
    </div>
    <Button onclick={handleSearch}>
      <Search size={18} />
      Buscar
    </Button>
  </div>
</Card>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else if products.length === 0}
  <Card>
    <EmptyState
      title="Sin productos"
      description={searchQuery ? 'No se encontraron productos con esa busqueda.' : 'No hay productos en el catalogo.'}
      icon={Package}
    >
      {#snippet action()}
        {#if searchQuery}
          <Button onclick={() => { searchQuery = ''; handleSearch(); }}>
            Limpiar busqueda
          </Button>
        {/if}
      {/snippet}
    </EmptyState>
  </Card>
{:else}
  <!-- Products table -->
  <Card padding="none">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-ios-gray-50 border-b border-ios-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
              Producto
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
              Codigo
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
              Marca / Categorias
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-ios-gray-500 uppercase">
              Precio
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-ios-gray-500 uppercase">
              Stock
            </th>
            <th class="px-4 py-3 text-center text-xs font-medium text-ios-gray-500 uppercase">
              ML
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-ios-gray-500 uppercase">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ios-gray-100">
          {#each products as product (product.id)}
            {@const brand = getBrandById(product.brandId)}
            {@const categoryNames = getProductCategoryNames(product.categories)}
            <tr class="hover:bg-ios-gray-50 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-ios bg-ios-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {#if product.image}
                      <img
                        src={product.image.startsWith('data:') ? product.image : `data:image/png;base64,${product.image}`}
                        alt={product.name}
                        class="w-full h-full object-cover"
                      />
                    {:else}
                      <Package size={20} class="text-ios-gray-400" />
                    {/if}
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-gray-900 truncate max-w-[200px]">
                      {product.name}
                    </p>
                    <p class="text-xs text-ios-gray-500">ID: {product.id}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <code class="text-xs bg-ios-gray-100 px-2 py-1 rounded">
                  {product.barcode || '-'}
                </code>
              </td>
              <td class="px-4 py-3">
                <div class="space-y-1">
                  <!-- Brand -->
                  {#if brand}
                    <a
                      href="/brands"
                      class="inline-flex items-center gap-1.5 text-sm text-ios-blue hover:underline"
                    >
                      <Tag size={14} />
                      {brand.name}
                    </a>
                  {:else if product.brandId}
                    <span class="text-xs text-ios-gray-400">ID: {product.brandId}</span>
                  {:else}
                    <span class="text-xs text-ios-gray-400">Sin marca</span>
                  {/if}

                  <!-- Categories -->
                  {#if categoryNames.length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each categoryNames.slice(0, 2) as catName}
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-ios-orange/10 text-ios-orange text-xs rounded-full">
                          <FolderTree size={10} />
                          {catName}
                        </span>
                      {/each}
                      {#if categoryNames.length > 2}
                        <span class="px-2 py-0.5 bg-ios-gray-100 text-ios-gray-600 text-xs rounded-full">
                          +{categoryNames.length - 2}
                        </span>
                      {/if}
                    </div>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <span class="font-medium text-gray-900">
                  ${product.salePrice?.toLocaleString() || '0'}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <Badge variant={product.stockQuantity > 0 ? 'success' : 'danger'} size="sm">
                  {product.stockQuantity}
                </Badge>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  onclick={() => toggleMercadolibre(product)}
                  aria-label="Toggle Mercado Libre para {product.name}"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                         {product.enMercadolibre ? 'bg-ios-green' : 'bg-ios-gray-300'}"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                           {product.enMercadolibre ? 'translate-x-6' : 'translate-x-1'}"
                  ></span>
                </button>
              </td>
              <td class="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" onclick={() => openEditModal(product)}>
                  <Pencil size={16} />
                </Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between px-4 py-3 border-t border-ios-gray-200">
        <p class="text-sm text-ios-gray-500">
          Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalProducts)} de {totalProducts}
        </p>
        <div class="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage === 1}
            onclick={() => goToPage(currentPage - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span class="text-sm text-gray-700">
            Pagina {currentPage} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage === totalPages}
            onclick={() => goToPage(currentPage + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    {/if}
  </Card>
{/if}

<!-- Edit Modal -->
<Modal
  bind:open={showModal}
  title="Editar producto"
  size="lg"
  onclose={closeModal}
>
  {#if editingProduct}
    <form onsubmit={handleSubmit} class="space-y-4">
      {#if formError}
        <div class="p-3 rounded-ios bg-ios-red/10 text-ios-red text-sm">
          {formError}
        </div>
      {/if}

      <!-- Product info -->
      <div class="flex items-start gap-4 p-4 bg-ios-gray-50 rounded-ios-lg">
        <div class="w-16 h-16 rounded-ios bg-ios-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          {#if editingProduct.image}
            <img
              src={editingProduct.image.startsWith('data:') ? editingProduct.image : `data:image/png;base64,${editingProduct.image}`}
              alt={editingProduct.name}
              class="w-full h-full object-cover"
            />
          {:else}
            <Package size={24} class="text-ios-gray-400" />
          {/if}
        </div>
        <div>
          <p class="text-sm text-ios-gray-500">Codigo de barras</p>
          <code class="text-sm font-mono">{editingProduct.barcode}</code>
        </div>
      </div>

      <Input
        label="Nombre"
        placeholder="Nombre del producto"
        bind:value={formName}
        required
      />

      <div class="grid grid-cols-2 gap-4">
        <Input
          type="number"
          label="Precio de venta"
          placeholder="0"
          bind:value={formSalePrice}
        />
        <Input
          type="number"
          label="Stock"
          placeholder="0"
          bind:value={formStockQuantity}
        />
      </div>

      <Select
        label="Marca"
        placeholder="Seleccionar marca"
        options={[{ value: '', label: 'Sin marca' }, ...brandOptions]}
        bind:value={formBrandId}
      />

      <!-- Categories -->
      <div class="relative">
        {#if loadingProduct}
          <div class="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-ios">
            <Spinner size="sm" />
          </div>
        {/if}
        <CategoryPicker
          categories={treeCategories}
          bind:selected={formCategoryIds}
          label="Categorias"
        />
      </div>

      <div>
        <span class="block text-sm font-medium text-gray-700 mb-1.5">
          Publicado en Mercado Libre
        </span>
        <button
          type="button"
          aria-label="Toggle Mercado Libre"
          onclick={() => (formEnMercadolibre = formEnMercadolibre ? 0 : 1)}
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                 {formEnMercadolibre ? 'bg-ios-green' : 'bg-ios-gray-300'}"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                   {formEnMercadolibre ? 'translate-x-6' : 'translate-x-1'}"
          ></span>
        </button>
      </div>
    </form>
  {/if}

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="secondary" onclick={closeModal}>
        Cancelar
      </Button>
      <Button loading={saving} onclick={handleSubmit}>
        Guardar cambios
      </Button>
    </div>
  {/snippet}
</Modal>
