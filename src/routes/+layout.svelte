<script lang="ts">
	import { scale } from "svelte/transition";

	import { page } from "$app/state";

	import MocaNetworkIcon from "@shared/assets/icons/moca-network-icon.svelte";
	import TopThisIcon from "@shared/assets/icons/topthis-icon.svelte";

	import "@fontsource/dm-sans/100.css";
	import "@fontsource/dm-sans/200.css";
	import "@fontsource/dm-sans/300.css";
	import "@fontsource/dm-sans/400.css";
	import "@fontsource/dm-sans/500.css";
	import "@fontsource/dm-sans/600.css";
	import "@fontsource/dm-sans/700.css";
	import "@fontsource/dm-sans/800.css";
	import "@fontsource/dm-sans/900.css";
	import "@shared/styles/global.css";

	/* Props */
	let { children } = $props();
</script>

<svelte:head>
	<title>TopThis x Moca Network</title>
</svelte:head>

<div
	class="fixed inset-0 grid h-screen w-screen grid-cols-1 grid-rows-12 flex-col items-center justify-center gap-16 p-5"
>
	<h1 class="sr-only">TopThis x Moca Network</h1>

	<a
		aria-hidden="true"
		href="/"
		class={[
			"flex items-center justify-center gap-4",
			page.route.id === "/" ? "row-span-12" : "row-span-7",
		]}
	>
		<TopThisIcon aria-hidden class="text-mvp-base-light" width={128} height={56} />
		<span aria-hidden="true" class="text-5xl font-bold text-mvp-red">&times;</span>
		<MocaNetworkIcon aria-hidden class="text-mvp-base-light" width={166} height={56} />
	</a>

	<div class="grow">
		{#key page.url.href}
			<div
				in:scale={{ delay: 200 }}
				out:scale={{ duration: 200 }}
				class="flex grow flex-col items-center justify-center"
			>
				{@render children?.()}
			</div>
		{/key}
	</div>
</div>
