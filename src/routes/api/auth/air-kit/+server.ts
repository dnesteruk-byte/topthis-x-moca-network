import { Air3Service, type Air3User } from "$lib/server/services/air3";
import { type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
	const authorization = request.headers.get("Authorization");
	const user = (await request.json()) as Air3User;
	const token = authorization?.split("Bearer ")?.[1];

	if (!token) {
		return Response.json("Invalid creadentials", { status: 401 });
	}

	// TODO: Verify Moca Network token

	const airService = new Air3Service();

	// Trying to authorise an user
	const { success, data, error } = await airService.authorizeUser(user);

	// Authorized success
	if (success && data) {
		return Response.json(data, { status: 200 });
	}

	// Authorization failed
	if (error) {
		return error;
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
		return Response.json(authData, { status: 200 });
	}

	// Authorization failed
	if (authError) {
		return authError;
	}

	return Response.json({ message: "Something went wrong..." }, { status: 500 });
};
