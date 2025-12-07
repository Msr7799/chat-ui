import { Elysia, t } from "elysia";
import { authPlugin } from "$api/authPlugin";
import { collections } from "$lib/server/database";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "$lib/server/cloudinary";
import { ObjectId } from "mongodb";
import { config } from "$lib/server/config";
import { logger } from "$lib/server/logger";
import { HfInference } from "@huggingface/inference";

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
				let generatedImageId = new ObjectId();
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
