import Elysia, { type Cookie } from "elysia";
import { authenticateRequest } from "../auth";

export const authPlugin = new Elysia({ name: "auth" }).derive(
	{ as: "scoped" },
	async ({
		headers,
		cookie,
	}): Promise<{
		locals: App.Locals;
	}> => {
		const auth = await authenticateRequest(
			{ type: "elysia", value: headers },
			// Type assertion needed because Elysia provides Cookie<unknown> but authenticateRequest expects Cookie<string | undefined>
			{ type: "elysia", value: cookie as unknown as Record<string, Cookie<string | undefined>> },
			true
		);
		return {
			locals: {
				user: auth?.user,
				sessionId: auth?.sessionId,
				isAdmin: auth?.isAdmin,
				token: auth?.token,
			},
		};
	}
);
