<script lang="ts">
	import { AirService, BUILD_ENV } from "@mocanetwork/airkit";
	import { untrack } from "svelte";

	import { env } from "$env/dynamic/public";

	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";

	import { httpClient } from "@shared/http-client";

	/* States */
	let pending = $state(false);
	let airKitInitializing = $state(true);

	const airService = new AirService({
		partnerId: env.PUBLIC_AIR3_PARTNER_ID,
	});

	/* Derived */
	const code = $derived.by(() => page.params.code!);

	/* Handlers */
	const init = async () => {
		try {
			await airService.init({
				buildEnv: BUILD_ENV.SANDBOX,
				enableLogging: true,
				skipRehydration: true,
			});
		} finally {
			airKitInitializing = false;
		}
	};

	const login = async () => {
		try {
			pending = true;

			const result = await airService.login();
			const info = await airService.getUserInfo();

			const { data } = await httpClient.post("/api/auth/air-kit", info.user, {
				baseURL: env.PUBLIC_APP_URL,
				headers: {
					Authorization: `Bearer ${result.token}`,
				},
			});

			await httpClient.post(
				"/v1/pair",
				{ code },
				{ headers: { Authorization: `Bearer ${data.access}` } }
			);

			await goto(resolve("/pair/success"));
		} catch (error) {
			console.log({ error });
		} finally {
			pending = false;
		}
	};

	/* Effects */
	$effect.pre(() => {
		untrack(init);
	});
</script>

{#if code}
	<button
		class={[
			"cursor-pointer rounded-lg bg-orange-500 px-6 py-2 text-white",
			"disabled:cursor-not-allowed disabled:opacity-70",
		]}
		onclick={login}
		disabled={airKitInitializing || pending}
	>
		Continue with Airkit
	</button>
{:else}
	<p class="text-center text-lg font-semibold text-red-500">Wrong pairing code</p>
{/if}
