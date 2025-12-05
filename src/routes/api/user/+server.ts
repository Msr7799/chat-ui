export async function GET({ locals }) {
	if (locals.user) {
		const res = {
			id: locals.user._id,
			username: locals.user.username,
			name: locals.user.name,
			email: locals.user.email,
			avatarUrl: locals.user.avatarUrl,
			hfUserId: locals.user.hfUserId,
		};

		return Response.json(res);
	}
	// ✅ Anonymous mode: إرجاع null بدلاً من 401
	// هذا يسمح بـ anonymous usage بدون errors
	return Response.json(null);
}
