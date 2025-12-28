import { Elysia } from "elysia";
import { authPlugin } from "$api/authPlugin";
import { collections } from "$lib/server/database";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "$lib/server/cloudinary";
import { ObjectId } from "mongodb";
import { config } from "$lib/server/config";
import { logger } from "$lib/server/logger";
import { HfInference } from "@huggingface/inference";

type GoogleModel = {
	id: string;
	created?: number;
	owned_by?: string;
};

type GoogleReferenceImage = {
	data: string;
	mimeType: string;
};

// Supported models
const MODELS = {
	"black-forest-labs/FLUX.1-schnell": "FLUX.1-schnell (Fast & High Quality)",
	"stabilityai/stable-diffusion-xl-base-1.0": "Stable Diffusion XL (Open Source Leader)",
	"ByteDance/SDXL-Lightning": "SDXL-Lightning (Ultra Fast)",
	"stabilityai/stable-diffusion-2-1": "Stable Diffusion 2.1 (Lightweight)",
	"playgroundai/playground-v2.5-1024px-aesthetic": "Playground v2.5 (Aesthetic Focused)",
};

const FLUX_MODEL_ID = "black-forest-labs/FLUX.1-schnell";

export const imageGroup = new Elysia().group("/images", (app) =>
	app
		.use(authPlugin)
		.get("/google/models", async ({ locals, set }) => {
			if (!locals.user) {
				set.status = 401;
				return { error: "Authentication required" };
			}

			const apiKey = config.GEMINI_API_KEY;
			if (!apiKey) {
				set.status = 500;
				return { error: "GEMINI_API_KEY not configured" };
			}

			try {
				const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/models", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"x-goog-api-key": apiKey,
					},
				});

				if (!res.ok) {
					const text = await res.text().catch(() => "");
					set.status = 502;
					return { error: `Failed to fetch Google models (${res.status}): ${text}` };
				}

				const json = (await res.json()) as { data?: GoogleModel[] };
				const models = Array.isArray(json.data) ? json.data : [];
				models.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

				return {
					models: models.map((m) => ({
						id: m.id,
						created: m.created,
					})),
				};
			} catch (error) {
				logger.error({ error: String(error) }, "Failed to fetch Google models");
				set.status = 502;
				return { error: "Failed to fetch Google models" };
			}
		})
		.post("/google/generate", async ({ locals, body, set }) => {
			const { prompt, model, referenceImage } = body as {
				prompt: string;
				model?: string;
				referenceImage?: GoogleReferenceImage;
			};

			if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
				set.status = 400;
				return { error: "Prompt is required" };
			}

			if (prompt.length > 500) {
				set.status = 400;
				return { error: "Prompt is too long (max 500 characters)" };
			}

			if (!locals.user) {
				set.status = 401;
				return { error: "Authentication required" };
			}

			const apiKey = config.GEMINI_API_KEY;
			if (!apiKey) {
				set.status = 500;
				return { success: false, error: "GEMINI_API_KEY not configured" };
			}

			const selectedModel = (
				model && typeof model === "string" && model.trim().length > 0
					? model.trim()
					: "gemini-2.5-flash-image"
			) as string;
			const selectedModelId = selectedModel.replace(/^models\//, "");

			let referenceImageClean: GoogleReferenceImage | undefined;
			if (referenceImage && typeof referenceImage === "object") {
				const mimeType = (referenceImage as any).mimeType;
				const dataRaw = (referenceImage as any).data;
				if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
					set.status = 400;
					return { success: false, error: "Invalid referenceImage.mimeType" };
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
					{ userId: locals.user._id, prompt, model: selectedModel },
					"Generating image (Google)"
				);

				const requestParts: Array<any> = [{ text: prompt.trim() }];
				if (referenceImageClean) {
					requestParts.push({
						inline_data: {
							mime_type: referenceImageClean.mimeType,
							data: referenceImageClean.data,
						},
					});
				}

				const res = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
						selectedModelId
					)}:generateContent`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-goog-api-key": apiKey,
						},
						body: JSON.stringify({
							contents: [
								{
									parts: requestParts,
								},
							],
							generationConfig: {
								responseModalities: ["TEXT", "IMAGE"],
							},
						}),
					}
				);

				if (!res.ok) {
					const text = await res.text().catch(() => "");
					set.status = 502;
					return {
						success: false,
						error: `Google image generation failed (${res.status}): ${text}`,
					};
				}

				const json = (await res.json()) as {
					candidates?: Array<{
						content?: {
							parts?: Array<{ text?: string; inlineData?: { data: string; mimeType?: string } }>;
						};
					}>;
				};

				const responseParts = json.candidates?.[0]?.content?.parts ?? [];
				const imagePart = responseParts.find((p) => p.inlineData?.data);

				if (!imagePart?.inlineData?.data) {
					set.status = 502;
					return {
						success: false,
						error: "Google image generation returned no image data",
					};
				}

				const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");

				const tags = ["google", "generated", locals.user._id.toString()];
				const cloudinaryResult = await uploadImageToCloudinary(imageBuffer, {
					folder: "chat-ui/generated-images",
					tags,
				});

				const generatedImageId = new ObjectId();
				const imageDoc = {
					_id: generatedImageId,
					userId: locals.user._id,
					prompt: prompt.trim(),
					cloudinaryUrl: cloudinaryResult.url,
					cloudinaryPublicId: cloudinaryResult.publicId,
					width: cloudinaryResult.width,
					height: cloudinaryResult.height,
					modelUsed: selectedModelId,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				await collections.generatedImages.insertOne(imageDoc);

				return {
					success: true,
					image: {
						_id: generatedImageId.toString(),
						url: cloudinaryResult.url,
						prompt: imageDoc.prompt,
						modelUsed: imageDoc.modelUsed,
						width: imageDoc.width,
						height: imageDoc.height,
						createdAt: imageDoc.createdAt,
					},
				};
			} catch (error) {
				logger.error({ error: String(error) }, "Google image generation failed");
				set.status = 500;
				return { success: false, error: "Failed to generate image: " + String(error) };
			}
		})
		.post("/generate", async ({ locals, body, set }) => {
			const { prompt, model } = body as { prompt: string; model?: string };

			if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
				set.status = 400;
				return { error: "Prompt is required" };
			}

			if (prompt.length > 500) {
				set.status = 400;
				return { error: "Prompt is too long (max 500 characters)" };
			}

			// Check authentication
			if (!locals.user) {
				set.status = 401;
				return { error: "Authentication required" };
			}

			// Validate model or use default
			const selectedModel = model && Object.keys(MODELS).includes(model) ? model : FLUX_MODEL_ID;

			try {
				const apiToken = config.OPENAI_API_KEY || config.HF_TOKEN;

				if (!apiToken) {
					throw new Error("HF_TOKEN not configured in .env");
				}

				logger.info({ userId: locals.user._id, prompt, model: selectedModel }, "Generating image");

				const hf = new HfInference(apiToken);

				const imageBlob = (await hf.textToImage({
					model: selectedModel,
					inputs: prompt.trim(),
				})) as unknown as Blob;

				// Convert Blob to Buffer
				const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

				// Upload to Cloudinary
				const tags = ["flux", "generated"];
				if (locals.user) {
					tags.push(locals.user._id.toString());
				}

				const cloudinaryResult = await uploadImageToCloudinary(imageBuffer, {
					folder: "chat-ui/generated-images",
					tags,
				});

				// Save to MongoDB
				const generatedImageId = new ObjectId();
				const imageDoc = {
					_id: generatedImageId,
					userId: locals.user._id,
					prompt: prompt.trim(),
					cloudinaryUrl: cloudinaryResult.url,
					cloudinaryPublicId: cloudinaryResult.publicId,
					width: cloudinaryResult.width,
					height: cloudinaryResult.height,
					modelUsed: selectedModel,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				await collections.generatedImages.insertOne(imageDoc);
				logger.info("Image generated and saved to MongoDB");

				// Return the generated image details to the frontend
				return {
					success: true,
					image: {
						_id: generatedImageId.toString(),
						url: cloudinaryResult.url,
						prompt: imageDoc.prompt,
						modelUsed: imageDoc.modelUsed,
						width: imageDoc.width,
						height: imageDoc.height,
						createdAt: imageDoc.createdAt,
					},
				};
			} catch (error) {
				logger.error({ error: String(error) }, "Image generation failed");
				set.status = 500;
				return { success: false, error: "Failed to generate image: " + String(error) };
			}
		})
		.get("/", async ({ locals, query, set }) => {
			// Check authentication
			if (!locals.user) {
				set.status = 401;
				return { error: "Authentication required" };
			}

			const page = parseInt((query.page as string) || "0", 10);
			const limit = Math.min(parseInt((query.limit as string) || "100", 10), 100);
			try {
				const images = await collections.generatedImages
					.find({ userId: locals.user._id })
					.sort({ createdAt: -1 })
					.skip(page * limit)
					.limit(limit)
					.toArray();

				const total = await collections.generatedImages.countDocuments({
					userId: locals.user._id,
				});

				return {
					images: images.map((img) => ({
						_id: img._id,
						prompt: img.prompt,
						url: img.cloudinaryUrl,
						width: img.width,
						height: img.height,
						modelUsed: img.modelUsed,
						createdAt: img.createdAt,
					})),
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit),
					},
				};
			} catch (error) {
				logger.error({ error: String(error) }, "Failed to fetch images");
				set.status = 500;
				return { error: "Failed to fetch images" };
			}
		})
		.delete("/:imageId", async ({ locals, params, set }) => {
			// Check authentication
			if (!locals.user) {
				set.status = 401;
				return { error: "Authentication required" };
			}

			const imageId = params.imageId;

			if (!ObjectId.isValid(imageId)) {
				set.status = 400;
				return { error: "Invalid image ID" };
			}

			try {
				const image = await collections.generatedImages.findOne({
					_id: new ObjectId(imageId),
					userId: locals.user._id,
				});

				if (!image) {
					set.status = 404;
					return { error: "Image not found" };
				}

				// Delete from Cloudinary
				await deleteImageFromCloudinary(image.cloudinaryPublicId);

				// Delete from MongoDB
				await collections.generatedImages.deleteOne({
					_id: new ObjectId(imageId),
				});

				logger.info("Image deleted successfully");

				return { success: true };
			} catch (error) {
				logger.error({ error: String(error) }, "Failed to delete image");
				set.status = 500;
				return { error: "Failed to delete image" };
			}
		})
);
