<script lang="ts">
  import { onMount } from 'svelte';
  import type { Brand } from '$lib/types';
  import {
    getBrands,
    createBrand,
    updateBrand,
    deleteBrand,
    uploadBrandImage
  } from '$lib/services/api';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { Plus, Pencil, Trash2, Tag, Upload, Globe } from 'lucide-svelte';

  let brands = $state<Brand[]>([]);
  let loading = $state(true);
  let showModal = $state(false);
  let editingBrand = $state<Brand | null>(null);
  let saving = $state(false);

  // Form state
  let formName = $state('');
  let formSlug = $state('');
  let formError = $state('');

  onMount(loadBrands);

  async function loadBrands() {
    loading = true;
    try {
      const res = await getBrands(true);
      if (res.success && res.data) {
        brands = res.data;
      }
    } catch (e) {
      console.error('Error cargando marcas:', e);
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingBrand = null;
    formName = '';
    formSlug = '';
    formError = '';
    showModal = true;
  }

  function openEditModal(brand: Brand) {
    editingBrand = brand;
    formName = brand.name;
    formSlug = brand.slug;
    formError = '';
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingBrand = null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';

    if (!formName.trim()) {
      formError = 'El nombre es requerido';
      return;
    }

    saving = true;

    try {
      if (editingBrand) {
        const res = await updateBrand(editingBrand.id, {
          name: formName,
          slug: formSlug || undefined
        });
        if (!res.success) {
          formError = res.error || 'Error al actualizar';
          saving = false;
          return;
        }
      } else {
        const res = await createBrand({
          name: formName,
          slug: formSlug || undefined
        });
        if (!res.success) {
          formError = res.error || 'Error al crear';
          saving = false;
          return;
        }
      }

      closeModal();
      await loadBrands();
    } catch (e) {
      formError = 'Error de conexion';
    } finally {
      saving = false;
    }
  }

  async function handleDelete(brand: Brand) {
    if (!confirm(`¿Desactivar la marca "${brand.name}"?`)) return;

    try {
      const res = await deleteBrand(brand.id);
      if (res.success) {
        await loadBrands();
      }
    } catch (e) {
      console.error('Error eliminando marca:', e);
    }
  }

  async function handleImageUpload(brand: Brand, e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const res = await uploadBrandImage(brand.id, file);
      if (res.success) {
        await loadBrands();
      }
    } catch (e) {
      console.error('Error subiendo imagen:', e);
    }

    input.value = '';
  }

  function generateSlug() {
    formSlug = formName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function toggleVisibleWeb(brand: Brand) {
    try {
      const res = await updateBrand(brand.id, {
        isVisibleWeb: brand.isVisibleWeb ? 0 : 1
      });
      if (res.success) {
        await loadBrands();
      }
    } catch (e) {
      console.error('Error actualizando visibilidad:', e);
    }
  }
</script>

<PageHeader title="Marcas" description="Gestiona las marcas de productos">
  {#snippet actions()}
    <Button onclick={openCreateModal}>
      <Plus size={18} />
      Nueva marca
    </Button>
  {/snippet}
</PageHeader>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else if brands.length === 0}
  <Card>
    <EmptyState
      title="Sin marcas"
      description="No hay marcas registradas. Crea la primera."
      icon={Tag}
    >
      {#snippet action()}
        <Button onclick={openCreateModal}>
          <Plus size={18} />
          Nueva marca
        </Button>
      {/snippet}
    </EmptyState>
  </Card>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {#each brands as brand (brand.id)}
      <Card padding="none" class="overflow-hidden">
        <!-- Image -->
        <div class="relative aspect-[3/2] bg-ios-gray-100 flex items-center justify-center">
          {#if brand.imageUrl}
            <img
              src={brand.imageUrl}
              alt={brand.name}
              class="w-full h-full object-cover"
            />
          {:else}
            <Tag size={48} class="text-ios-gray-300" />
          {/if}

          <!-- Image upload button -->
          <label
            class="absolute bottom-2 right-2 p-2 bg-white/90 backdrop-blur rounded-ios
                   cursor-pointer hover:bg-white transition-colors shadow-ios"
          >
            <Upload size={16} class="text-ios-gray-600" />
            <input
              type="file"
              accept="image/*"
              class="hidden"
              onchange={(e) => handleImageUpload(brand, e)}
            />
          </label>
        </div>

        <!-- Content -->
        <div class="p-4">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 class="font-medium text-gray-900">{brand.name}</h3>
              <p class="text-xs text-ios-gray-500">{brand.slug}</p>
            </div>
            <div class="flex items-center gap-1">
              <Badge variant={brand.isActive ? 'success' : 'danger'} size="sm">
                {brand.isActive ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
          </div>

          <div class="flex items-center gap-2 mt-3">
            <Button
              variant="secondary"
              size="sm"
              class="flex-1"
              onclick={() => openEditModal(brand)}
            >
              <Pencil size={14} />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => toggleVisibleWeb(brand)}
              title={brand.isVisibleWeb ? 'Visible en web - Click para ocultar' : 'Oculta en web - Click para mostrar'}
            >
              <Globe size={14} class={brand.isVisibleWeb ? 'text-ios-blue' : 'text-ios-gray-400'} />
            </Button>
            {#if brand.isActive}
              <Button
                variant="ghost"
                size="sm"
                onclick={() => handleDelete(brand)}
              >
                <Trash2 size={14} class="text-ios-red" />
              </Button>
            {/if}
          </div>
        </div>
      </Card>
    {/each}
  </div>
{/if}

<!-- Modal -->
<Modal
  bind:open={showModal}
  title={editingBrand ? 'Editar marca' : 'Nueva marca'}
  onclose={closeModal}
>
  <form onsubmit={handleSubmit} class="space-y-4">
    {#if formError}
      <div class="p-3 rounded-ios bg-ios-red/10 text-ios-red text-sm">
        {formError}
      </div>
    {/if}

    <Input
      label="Nombre"
      placeholder="Nombre de la marca"
      bind:value={formName}
      required
      oninput={!editingBrand ? generateSlug : undefined}
    />

    <Input
      label="Slug"
      placeholder="nombre-de-la-marca"
      bind:value={formSlug}
    />
  </form>

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="secondary" onclick={closeModal}>
        Cancelar
      </Button>
      <Button loading={saving} onclick={handleSubmit}>
        {editingBrand ? 'Guardar cambios' : 'Crear marca'}
      </Button>
    </div>
  {/snippet}
</Modal>
