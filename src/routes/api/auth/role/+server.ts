import { type RequestHandler } from "@sveltejs/kit";

import { Air3Service } from "$lib/server/services/air3";

import type { Air3UserRole } from "@shared/constants/role";

export const POST: RequestHandler = async ({ request }) => {
	const authorization = request.headers.get("Authorization");
	const token = authorization?.split("Bearer ")?.[1];
	const body = (await request.json()) as { role: Air3UserRole };

	if (!token) {
		return Response.json("Invalid creadentials", { status: 401 });
	}

	const airService = new Air3Service();

	const result = await airService.addRole(token, body.role);

	if (result.error) {
		return result.error;
	}

	return Response.json({ success: true }, { status: 201 });
};
