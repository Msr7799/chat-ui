import { Elysia, status } from "elysia";
import { authPlugin } from "../../authPlugin";
import { collections } from "$lib/server/database";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "$lib/server/cloudinary";
import { ObjectId } from "mongodb";
import { config } from "$lib/server/config";
import { logger } from "$lib/server/logger";

const FLUX_MODEL_ID = "black-forest-labs/FLUX.1-schnell";
const HF_INFERENCE_API = "https://api-inference.huggingface.co/models";

export const imageGroup = new Elysia().group("/images", (app) =>
	app
		.use(authPlugin)
		.post("/generate", async ({ locals, body }) => {
			// Check authentication
			if (!locals.user) {
				throw status(401, "Authentication required to generate images");
			}

			const { prompt } = body as { prompt: string };

			if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
				throw status(400, "Prompt is required");
			}

			if (prompt.length > 500) {
				throw status(400, "Prompt is too long (max 500 characters)");
			}

			try {
				// Get user token or use server token
				const apiToken = locals.token || config.OPENAI_API_KEY;

				if (!apiToken) {
					throw new Error("No API token available");
				}

				// Call Hugging Face Inference API
				logger.info(
					{ model: FLUX_MODEL_ID, userId: locals.user._id },
					"Generating image with FLUX"
				);

				const response = await fetch(`${HF_INFERENCE_API}/${FLUX_MODEL_ID}`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${apiToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						inputs: prompt,
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					logger.error({ status: response.status, error: errorText }, "FLUX API error");
					throw new Error(`Image generation failed: ${response.statusText}`);
				}

				// Get image as buffer
				const imageBuffer = Buffer.from(await response.arrayBuffer());

				// Upload to Cloudinary
				const cloudinaryResult = await uploadImageToCloudinary(imageBuffer, {
					folder: "chat-ui/generated-images",
					tags: ["flux", "generated", locals.user._id.toString()],
				});

				// Save to MongoDB
				const generatedImage = await collections.generatedImages.insertOne({
					_id: new ObjectId(),
					userId: locals.user._id,
					prompt: prompt.trim(),
					cloudinaryUrl: cloudinaryResult.url,
					cloudinaryPublicId: cloudinaryResult.publicId,
					width: cloudinaryResult.width,
					height: cloudinaryResult.height,
					modelUsed: FLUX_MODEL_ID,
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				logger.info(
					{ imageId: generatedImage.insertedId, userId: locals.user._id },
					"Image generated successfully"
				);

				return {
					success: true,
					image: {
						_id: generatedImage.insertedId,
						url: cloudinaryResult.url,
						prompt: prompt.trim(),
						width: cloudinaryResult.width,
						height: cloudinaryResult.height,
						createdAt: new Date(),
					},
				};
			} catch (error) {
				logger.error({ error: String(error) }, "Image generation failed");
				throw status(500, `Failed to generate image: ${error}`);
			}
		})
		.get("/", async ({ locals, query }) => {
			// Check authentication
			if (!locals.user) {
				throw status(401, "Authentication required");
			}

			const page = parseInt((query.page as string) || "0", 10);
			const limit = Math.min(parseInt((query.limit as string) || "20", 10), 50);

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
				throw status(500, "Failed to fetch images");
			}
		})
		.delete("/:imageId", async ({ locals, params }) => {
			// Check authentication
			if (!locals.user) {
				throw status(401, "Authentication required");
			}

			const imageId = params.imageId;

			if (!ObjectId.isValid(imageId)) {
				throw status(400, "Invalid image ID");
			}

			try {
				const image = await collections.generatedImages.findOne({
					_id: new ObjectId(imageId),
					userId: locals.user._id,
				});

				if (!image) {
					throw status(404, "Image not found");
				}

				// Delete from Cloudinary
				await deleteImageFromCloudinary(image.cloudinaryPublicId);

				// Delete from MongoDB
				await collections.generatedImages.deleteOne({
					_id: new ObjectId(imageId),
				});

				logger.info({ imageId, userId: locals.user._id }, "Image deleted successfully");

				return { success: true };
			} catch (error) {
				logger.error({ error: String(error) }, "Failed to delete image");
				throw status(500, "Failed to delete image");
			}
		})
);
