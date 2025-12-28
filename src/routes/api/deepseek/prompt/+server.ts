import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";

export async function POST({ request }) {
	let body: any;
	try {
		body = await request.json();
	} catch {
		throw error(400, "Invalid JSON body");
	}

	const input = String(body?.input ?? body?.text ?? body?.prompt ?? "").trim();
	if (!input) {
		throw error(400, "Missing 'input'");
	}

	const directDeepSeekKey = String(env.DEEPSEEK_API_KEY ?? "").trim();
	const openAIBaseUrl = String(env.OPENAI_BASE_URL ?? "").trim();
	const openAIKey = String(env.OPENAI_API_KEY ?? "").trim();
	const provider = String(env.PROMPT_ENHANCER_PROVIDER ?? "")
		.trim()
		.toLowerCase();

	const systemPrompt =
		"You are a senior prompt engineer for image generation. Convert the user's request (any language) into ONE concise, high-quality English image prompt. Include subject, composition, style, lighting, camera/shot details, environment, and quality cues. Keep it safe and non-graphic. Return only the prompt text (no quotes, no markdown).";

	let url: string;
	let apiKey: string;
	let model: string;

	const hasHfRouter = Boolean(openAIBaseUrl && openAIKey);
	const forceDeepSeek = provider === "deepseek";

	if (forceDeepSeek) {
		if (!directDeepSeekKey) {
			throw error(500, "DEEPSEEK_API_KEY is not configured");
		}
		url = "https://api.deepseek.com/chat/completions";
		apiKey = directDeepSeekKey;
		model = String(env.DEEPSEEK_MODEL ?? "deepseek-chat");
	} else if (hasHfRouter) {
		url = `${openAIBaseUrl.replace(/\/$/, "")}/chat/completions`;
		apiKey = openAIKey;
		model = String(env.PROMPT_ENHANCER_MODEL ?? env.DEEPSEEK_MODEL ?? "deepseek-ai/DeepSeek-V3");
	} else if (directDeepSeekKey) {
		url = "https://api.deepseek.com/chat/completions";
		apiKey = directDeepSeekKey;
		model = String(env.DEEPSEEK_MODEL ?? "deepseek-chat");
	} else {
		throw error(500, "OPENAI_BASE_URL / OPENAI_API_KEY is not configured");
	}

	const res = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model,
			temperature: 0.6,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: input },
			],
		}),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw error(res.status, text || `DeepSeek request failed (${res.status})`);
	}

	const data = (await res.json().catch(() => null)) as any;
	const content = String(data?.choices?.[0]?.message?.content ?? "").trim();
	if (!content) {
		throw error(502, "DeepSeek returned an empty response");
	}

	return Response.json({ prompt: content });
}
