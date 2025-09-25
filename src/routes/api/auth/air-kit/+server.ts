import { type RequestHandler } from "@sveltejs/kit";

import { Air3Service, type Air3User } from "$lib/server/services/air3";

import { Air3AuthStatus } from "@shared/constants/auth-status";

export const POST: RequestHandler = async ({ request }) => {
	const authorization = request.headers.get("Authorization");
	const user = (await request.json()) as Air3User;
	const token = authorization?.split("Bearer ")?.[1];

	if (!token) {
		return Response.json("Invalid creadentials", { status: 401 });
	}

	const airService = new Air3Service();

	// Token verifying
	await airService.verifyAir3Token(token);

	// Trying to authorise an user
	const { success, data, error } = await airService.authorizeUser(user);

	// Authorization failed
	if (error) {
		return error;
	}

	const { data: userData } = await airService.getUser(data?.access as string);

	// Authorized success
	if (success && data && userData) {
		return Response.json(
			{ ...data, status: userData!.air3Role ? Air3AuthStatus.Verified : Air3AuthStatus.New },
			{ status: 200 }
		);
	}

	// User doesn't exists. Trying to create
	const { error: creatingError } = await airService.createUser(user);

	// User creation failed
	if (creatingError) {
		return creatingError;
	}

	// User created. Trying to authorise one more time
	const {
		success: authSuccess,
		data: authData,
		error: authError,
	} = await airService.authorizeUser(user);

	// Authorized success
	if (authSuccess && authData) {
		return Response.json({ ...authData, status: Air3AuthStatus.New }, { status: 200 });
	}

	// Authorization failed
	if (authError) {
		return authError;
	}

	return Response.json({ message: "Something went wrong..." }, { status: 500 });
};
