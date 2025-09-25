<script lang="ts">
	import { env } from "$env/dynamic/public";

	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";

	import Spinner from "@shared/assets/icons/spinner.svelte";
	import { Air3UserRole } from "@shared/constants/role";
	import { httpClient } from "@shared/http-client";

	let error = $state("");
	let code = $derived.by(() => page.params.code);
	let role = $state<Air3UserRole>();
	let pending = $state(false);

	const addRole = async () => {
		pending = true;

		try {
			const data = JSON.parse(localStorage.getItem("auth")!) as { access: string };

			await httpClient.post(
				"/api/auth/role",
				{ role },
				{
					baseURL: env.PUBLIC_APP_URL,
					headers: {
						Authorization: `Bearer ${data.access}`,
					},
				}
			);

			await httpClient.post(
				"/v1/pair",
				{ code },
				{ headers: { Authorization: `Bearer ${data.access}` } }
			);

			await goto(resolve("/pair/success"));
		} catch (err) {
			console.error({ err });
			error = "Something went wrong...";
		} finally {
			pending = false;
		}
	};
</script>

{#snippet radio(value: Air3UserRole, label: string, disabled?: boolean)}
	{@const selected = value === role}

	<label
		for={value}
		class={[
			"flex w-full  items-center justify-start gap-2 border-b border-mvp-base-light/30 py-3 transition-all",
			disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
		]}
	>
		<!-- Indicator -->
		<div
			class={[
				"size-5 rounded-full border-2 border-mvp-base-light transition-all",
				selected && "border-[6px]",
			]}
		></div>

		<!-- Label -->
		<span class="text-base font-medium">{label}</span>

		<!-- Input -->
		<input class="sr-only" id={value} bind:group={role} {disabled} {value} type="radio" />
	</label>
{/snippet}

<div class="flex max-w-md flex-col items-center gap-8">
	<p class="text-center text-xl font-semibold">Choose the role that mostly fits your experience</p>

	<div class="flex w-full flex-col gap-4">
		{@render radio(Air3UserRole.Fan, "I'm mostly a fan", pending)}
		{@render radio(Air3UserRole.Creator, "I'm mostly a creator", pending)}
		{@render radio(Air3UserRole.FanAndCreator, "I'm a fan and a creator", pending)}
	</div>

	{#if error}
		<p class="error-text text-center">{error}</p>
	{/if}

	<button class="button" onclick={addRole} disabled={!role || pending}>
		{#if pending}
			<Spinner aria-hidden class="size-6 animate-spin text-mvp-red" />
		{/if}
		Next
	</button>
</div>
