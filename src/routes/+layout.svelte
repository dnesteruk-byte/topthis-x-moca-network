<script lang="ts">
	import "@shared/styles/global.css";

	let { children } = $props();
</script>

<svelte:head>
	<title>TopThis x Moca Network</title>
</svelte:head>

<div class="flex h-screen w-screen flex-col items-center justify-center gap-16">
	<h1 class="text-center text-5xl font-bold">
		TopThis <br /><span class="text-orange-500">x</span><br /> Moca Network
	</h1>

	{@render children?.()}
</div>
