<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';

    if (!email || !password) {
      error = 'Por favor completa todos los campos';
      return;
    }

    loading = true;

    const result = await auth.login(email, password);

    if (result.success) {
      goto('/');
    } else {
      error = result.error || 'Error al iniciar sesion';
    }

    loading = false;
  }
</script>

<div class="min-h-screen bg-ios-gray-100 flex items-center justify-center p-4">
  <div class="w-full max-w-sm">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-ios-xl bg-ios-blue mb-4">
        <span class="text-white font-bold text-2xl">T</span>
      </div>
      <h1 class="text-2xl font-semibold text-gray-900">THS Admin</h1>
      <p class="text-sm text-ios-gray-500 mt-1">Panel de administracion</p>
    </div>

    <!-- Form -->
    <Card>
      <form onsubmit={handleSubmit} class="space-y-4">
        {#if error}
          <div class="p-3 rounded-ios bg-ios-red/10 text-ios-red text-sm">
            {error}
          </div>
        {/if}

        <Input
          type="email"
          label="Correo electronico"
          placeholder="admin@ejemplo.com"
          bind:value={email}
          required
        />

        <Input
          type="password"
          label="Contrasena"
          placeholder="Tu contrasena"
          bind:value={password}
          required
        />

        <Button type="submit" {loading} class="w-full">
          {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
        </Button>
      </form>
    </Card>

    <p class="text-center text-xs text-ios-gray-400 mt-6">
      THS Admin v1.0.0
    </p>
  </div>
</div>
