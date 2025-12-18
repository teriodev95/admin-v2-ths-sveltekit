<script lang="ts">
  import { onMount } from 'svelte';
  import type { Category } from '$lib/types';
  import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryImage
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
  import {
    Plus,
    Pencil,
    Trash2,
    FolderTree,
    ChevronRight,
    ChevronDown,
    Upload
  } from 'lucide-svelte';

  let categories = $state<Category[]>([]);
  let flatCategories = $state<Category[]>([]);
  let loading = $state(true);
  let showModal = $state(false);
  let editingCategory = $state<Category | null>(null);
  let saving = $state(false);
  let expandedIds = $state<Set<number>>(new Set());

  // Form state
  let formName = $state('');
  let formSlug = $state('');
  let formParentId = $state<number | ''>('');
  let formError = $state('');

  onMount(loadCategories);

  async function loadCategories() {
    loading = true;
    try {
      const [treeRes, flatRes] = await Promise.all([
        getCategories(false, true),
        getCategories(true, true)
      ]);

      if (treeRes.success && treeRes.data) {
        categories = treeRes.data;
      }
      if (flatRes.success && flatRes.data) {
        flatCategories = flatRes.data;
      }
    } catch (e) {
      console.error('Error cargando categorias:', e);
    } finally {
      loading = false;
    }
  }

  function toggleExpand(id: number) {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedIds = newSet;
  }

  function openCreateModal(parentId?: number) {
    editingCategory = null;
    formName = '';
    formSlug = '';
    formParentId = parentId || '';
    formError = '';
    showModal = true;
  }

  function openEditModal(category: Category) {
    editingCategory = category;
    formName = category.name;
    formSlug = category.slug;
    formParentId = category.parentId || '';
    formError = '';
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingCategory = null;
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
      const data = {
        name: formName,
        slug: formSlug || undefined,
        parentId: formParentId || null
      };

      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, data);
        if (!res.success) {
          formError = res.error || 'Error al actualizar';
          saving = false;
          return;
        }
      } else {
        const res = await createCategory(data);
        if (!res.success) {
          formError = res.error || 'Error al crear';
          saving = false;
          return;
        }
      }

      closeModal();
      await loadCategories();
    } catch (e) {
      formError = 'Error de conexion';
    } finally {
      saving = false;
    }
  }

  async function handleDelete(category: Category) {
    if (!confirm(`¿Desactivar la categoria "${category.name}"?`)) return;

    try {
      const res = await deleteCategory(category.id);
      if (res.success) {
        await loadCategories();
      }
    } catch (e) {
      console.error('Error eliminando categoria:', e);
    }
  }

  async function handleImageUpload(category: Category, e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const res = await uploadCategoryImage(category.id, file);
      if (res.success) {
        await loadCategories();
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

  const parentOptions = $derived(
    flatCategories
      .filter((c) => c.id !== editingCategory?.id && c.isActive)
      .map((c) => ({ value: c.id, label: c.name }))
  );
</script>

<PageHeader title="Categorias" description="Gestiona las categorias de productos">
  {#snippet actions()}
    <Button onclick={() => openCreateModal()}>
      <Plus size={18} />
      Nueva categoria
    </Button>
  {/snippet}
</PageHeader>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <Spinner size="lg" />
  </div>
{:else if categories.length === 0}
  <Card>
    <EmptyState
      title="Sin categorias"
      description="No hay categorias registradas. Crea la primera."
      icon={FolderTree}
    >
      {#snippet action()}
        <Button onclick={() => openCreateModal()}>
          <Plus size={18} />
          Nueva categoria
        </Button>
      {/snippet}
    </EmptyState>
  </Card>
{:else}
  <Card padding="none">
    <div class="divide-y divide-ios-gray-100">
      {#each categories as category (category.id)}
        {@render categoryRow(category, 0)}
      {/each}
    </div>
  </Card>
{/if}

{#snippet categoryRow(category: Category, level: number)}
  <div class="group">
    <div
      class="flex items-center gap-3 px-4 py-3 hover:bg-ios-gray-50 transition-colors"
      style="padding-left: {16 + level * 24}px"
    >
      <!-- Expand button -->
      {#if category.children && category.children.length > 0}
        <button
          onclick={() => toggleExpand(category.id)}
          class="p-1 rounded hover:bg-ios-gray-200 transition-colors"
        >
          {#if expandedIds.has(category.id)}
            <ChevronDown size={16} class="text-ios-gray-500" />
          {:else}
            <ChevronRight size={16} class="text-ios-gray-500" />
          {/if}
        </button>
      {:else}
        <div class="w-6"></div>
      {/if}

      <!-- Image -->
      <div class="w-10 h-10 rounded-ios bg-ios-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {#if category.imageUrl}
          <img src={category.imageUrl} alt={category.name} class="w-full h-full object-cover" />
        {:else}
          <FolderTree size={18} class="text-ios-gray-400" />
        {/if}
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-900 truncate">{category.name}</span>
          <Badge variant={category.isActive ? 'success' : 'danger'} size="sm">
            {category.isActive ? 'Activa' : 'Inactiva'}
          </Badge>
        </div>
        <p class="text-xs text-ios-gray-500 truncate">{category.slug}</p>
      </div>

      <!-- Children count -->
      {#if category.children && category.children.length > 0}
        <span class="text-xs text-ios-gray-400">
          {category.children.length} sub
        </span>
      {/if}

      <!-- Actions -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <label class="p-2 rounded-ios hover:bg-ios-gray-100 cursor-pointer transition-colors">
          <Upload size={16} class="text-ios-gray-500" />
          <input
            type="file"
            accept="image/*"
            class="hidden"
            onchange={(e) => handleImageUpload(category, e)}
          />
        </label>
        <button
          onclick={() => openCreateModal(category.id)}
          class="p-2 rounded-ios hover:bg-ios-gray-100 transition-colors"
          title="Agregar subcategoria"
        >
          <Plus size={16} class="text-ios-gray-500" />
        </button>
        <button
          onclick={() => openEditModal(category)}
          class="p-2 rounded-ios hover:bg-ios-gray-100 transition-colors"
        >
          <Pencil size={16} class="text-ios-gray-500" />
        </button>
        {#if category.isActive}
          <button
            onclick={() => handleDelete(category)}
            class="p-2 rounded-ios hover:bg-ios-red/10 transition-colors"
          >
            <Trash2 size={16} class="text-ios-red" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Children -->
    {#if category.children && category.children.length > 0 && expandedIds.has(category.id)}
      {#each category.children as child (child.id)}
        {@render categoryRow(child, level + 1)}
      {/each}
    {/if}
  </div>
{/snippet}

<!-- Modal -->
<Modal
  bind:open={showModal}
  title={editingCategory ? 'Editar categoria' : 'Nueva categoria'}
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
      placeholder="Nombre de la categoria"
      bind:value={formName}
      required
      oninput={!editingCategory ? generateSlug : undefined}
    />

    <Input
      label="Slug"
      placeholder="nombre-de-la-categoria"
      bind:value={formSlug}
    />

    <Select
      label="Categoria padre"
      placeholder="Sin padre (categoria raiz)"
      options={[{ value: '', label: 'Sin padre (categoria raiz)' }, ...parentOptions]}
      bind:value={formParentId}
    />
  </form>

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="secondary" onclick={closeModal}>
        Cancelar
      </Button>
      <Button loading={saving} onclick={handleSubmit}>
        {editingCategory ? 'Guardar cambios' : 'Crear categoria'}
      </Button>
    </div>
  {/snippet}
</Modal>
