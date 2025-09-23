<script lang="ts">
	import "@shared/styles/global.css";

	let { children } = $props();
</script>

<svelte:head>
	<title>TopThis x Moca Network</title>
</svelte:head>

<div class="flex h-screen w-screen flex-col items-center justify-center">
	{@render children?.()}
</div>
