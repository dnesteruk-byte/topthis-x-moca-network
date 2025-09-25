<script lang="ts">
	import { AirService, BUILD_ENV } from "@mocanetwork/airkit";
	import { untrack } from "svelte";

	import { env } from "$env/dynamic/public";

	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";

	import Spinner from "@shared/assets/icons/spinner.svelte";
	import { Air3AuthStatus } from "@shared/constants/auth-status";
	import { httpClient } from "@shared/http-client";
	import { isDevEnv } from "@shared/utils/env";

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
				buildEnv: isDevEnv() ? BUILD_ENV.SANDBOX : BUILD_ENV.PRODUCTION,
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

			// Create or authorize an user
			const { data } = await httpClient.post("/api/auth/air-kit", info.user, {
				baseURL: env.PUBLIC_APP_URL,
				headers: {
					Authorization: `Bearer ${result.token}`,
				},
			});

			// Redirect an user if it's new one
			if (data.status === Air3AuthStatus.New) {
				localStorage.setItem("auth", JSON.stringify(data));
				await goto(resolve(`/pair/${code}/role`));
				return;
			}

			// Pair TV device
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

<div class="flex max-w-md flex-col items-center justify-center gap-8">
	{#if code}
		<button class="button" onclick={login} disabled={airKitInitializing || pending}>
			{#if pending || airKitInitializing}
				<Spinner aria-hidden class="size-6 animate-spin text-mvp-red" />
			{/if}
			Continue with AIR Kit
		</button>
	{:else}
		<p class="error-text text-center">Wrong pairing code</p>
	{/if}
</div>
