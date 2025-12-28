import { Elysia } from "elysia";
import { authPlugin } from "$api/authPlugin";
import { collections } from "$lib/server/database";
import { ObjectId } from "mongodb";
import { config } from "$lib/server/config";
import { logger } from "$lib/server/logger";
import { uploadVideoToCloudinary } from "$lib/server/cloudinary";
import { GoogleGenAI } from "@google/genai";

type GoogleReferenceImage = {
	data: string;
	mimeType: string;
};

const ALLOWED_VEO_MODELS = new Set(["veo-3.1-generate-preview", "veo-3.1-fast-generate-preview"]);

export const videoGroup = new Elysia().group("/videos", (app) =>
	app
		.use(authPlugin)
		.post("/google/generate", async ({ locals, body, set }) => {
			const { prompt, model, mode, referenceImage } = body as {
				prompt: string;
				model?: string;
				mode?: "text-to-video" | "image-to-video";
				referenceImage?: GoogleReferenceImage;
			};

			if (!locals.user) {
				set.status = 401;
				return { error: "Authentication required" };
			}

			if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
				set.status = 400;
				return { success: false, error: "Prompt is required" };
			}

			if (prompt.length > 1200) {
				set.status = 400;
				return { success: false, error: "Prompt is too long (max 1200 characters)" };
			}

			const apiKey = config.GEMINI_API_KEY;
			if (!apiKey) {
				set.status = 500;
				return { success: false, error: "GEMINI_API_KEY not configured" };
			}

			const selectedModel =
				model && typeof model === "string" && ALLOWED_VEO_MODELS.has(model.trim())
					? model.trim()
					: "veo-3.1-generate-preview";

			const selectedMode: "text-to-video" | "image-to-video" =
				mode === "image-to-video" ? "image-to-video" : "text-to-video";

			let referenceImageClean: GoogleReferenceImage | undefined;
			if (selectedMode === "image-to-video") {
				if (!referenceImage || typeof referenceImage !== "object") {
					set.status = 400;
					return { success: false, error: "referenceImage is required for image-to-video" };
				}
				const mimeType = (referenceImage as any).mimeType;
				const dataRaw = (referenceImage as any).data;
				if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
					set.status = 400;
					return { success: false, error: "Invalid referenceImage.mimeType" };
				}
				if (mimeType !== "image/jpeg" && mimeType !== "image/png") {
					set.status = 400;
					return {
						success: false,
						error: "Unsupported reference image type. Please use PNG or JPEG.",
					};
				}
				if (typeof dataRaw !== "string" || dataRaw.trim().length === 0) {
					set.status = 400;
					return { success: false, error: "Invalid referenceImage.data" };
				}
				const cleaned = dataRaw.includes(",") ? (dataRaw.split(",").pop() ?? "") : dataRaw;
				referenceImageClean = {
					mimeType,
					data: cleaned.trim(),
				};
			}

			try {
				logger.info(
					{ userId: locals.user._id, prompt, model: selectedModel, mode: selectedMode },
					"Generating video (Google Veo)"
				);

				const ai = new GoogleGenAI({ apiKey });

				let operation = await ai.models.generateVideos({
					model: selectedModel,
					prompt: prompt.trim(),
					...(referenceImageClean
						? {
								image: {
									imageBytes: referenceImageClean.data,
									mimeType: referenceImageClean.mimeType,
								},
							}
						: {}),
					config: {
						numberOfVideos: 1,
						aspectRatio: "16:9",
						resolution: "720p",
						...(referenceImageClean ? { personGeneration: "allow_adult" as const } : {}),
					},
				});

				const maxPolls = 90;
				let polls = 0;
				while (!operation.done) {
					polls += 1;
					if (polls > maxPolls) {
						set.status = 504;
						return { success: false, error: "Video generation timed out" };
					}
					await new Promise((r) => setTimeout(r, 10000));
					operation = await ai.operations.getVideosOperation({ operation });
				}

				const videoObj = operation?.response?.generatedVideos?.[0]?.video;
				const uri = typeof videoObj?.uri === "string" ? videoObj.uri : "";
				if (!uri) {
					set.status = 502;
					return { success: false, error: "No generated video URI returned" };
				}

				const videoUri = decodeURIComponent(uri);
				const headers = { "x-goog-api-key": apiKey } as Record<string, string>;

				let videoRes = await fetch(videoUri, { headers });
				if (!videoRes.ok) {
					const fallbackUri = `${videoUri}${videoUri.includes("?") ? "&" : "?"}key=${apiKey}`;
					videoRes = await fetch(fallbackUri, { headers });
				}

				if (!videoRes.ok) {
					const text = await videoRes.text().catch(() => "");
					set.status = 502;
					return { success: false, error: `Failed to fetch generated video: ${text}` };
				}

				const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

				const tags = ["google", "veo", locals.user._id.toString()];
				const cloudinaryResult = await uploadVideoToCloudinary(videoBuffer, {
					folder: "chat-ui/generated-videos",
					tags,
				});

				const generatedVideoId = new ObjectId();
				const videoDoc = {
					_id: generatedVideoId,
					userId: locals.user._id,
					prompt: prompt.trim(),
					cloudinaryUrl: cloudinaryResult.url,
					cloudinaryPublicId: cloudinaryResult.publicId,
					modelUsed: selectedModel,
					mode: selectedMode,
					width: cloudinaryResult.width,
					height: cloudinaryResult.height,
					duration: cloudinaryResult.duration,
					operationName: (operation as any)?.name,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				await collections.generatedVideos.insertOne(videoDoc as any);

				return {
					success: true,
					video: {
						_id: generatedVideoId.toString(),
						url: cloudinaryResult.url,
						prompt: videoDoc.prompt,
						modelUsed: videoDoc.modelUsed,
						mode: videoDoc.mode,
						width: videoDoc.width,
						height: videoDoc.height,
						duration: videoDoc.duration,
						createdAt: videoDoc.createdAt,
					},
				};
			} catch (error) {
				logger.error({ error: String(error) }, "Google video generation failed");
				set.status = 500;
				return { success: false, error: "Failed to generate video: " + String(error) };
			}
		})
		.get("/", async ({ locals, query, set }) => {
			if (!locals.user) {
				set.status = 401;
				return { error: "Authentication required" };
			}

			const page = parseInt((query.page as string) || "0", 10);
			const limit = Math.min(parseInt((query.limit as string) || "50", 10), 100);
			try {
				const videos = await collections.generatedVideos
					.find({ userId: locals.user._id })
					.sort({ createdAt: -1 })
					.skip(page * limit)
					.limit(limit)
					.toArray();

				const total = await collections.generatedVideos.countDocuments({ userId: locals.user._id });

				return {
					videos: videos.map((v: any) => ({
						_id: v._id,
						prompt: v.prompt,
						url: v.cloudinaryUrl,
						modelUsed: v.modelUsed,
						mode: v.mode,
						width: v.width,
						height: v.height,
						duration: v.duration,
						createdAt: v.createdAt,
					})),
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit),
					},
				};
			} catch (error) {
				logger.error({ error: String(error) }, "Failed to fetch videos");
				set.status = 500;
				return { error: "Failed to fetch videos" };
			}
		})
);
