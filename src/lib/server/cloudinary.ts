import { config } from "$lib/server/config";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
	cloud_name: config.CLOUDINARY_CLOUD_NAME,
	api_key: config.CLOUDINARY_API_KEY,
	api_secret: config.CLOUDINARY_API_SECRET,
});

export async function uploadImageToCloudinary(
	imageBuffer: Buffer,
	options?: {
		folder?: string;
		public_id?: string;
		tags?: string[];
	}
): Promise<{
	url: string;
	publicId: string;
	width: number;
	height: number;
}> {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: options?.folder || "chat-ui/generated-images",
				public_id: options?.public_id,
				tags: options?.tags || ["flux", "generated"],
				resource_type: "image",
			},
			(error, result) => {
				if (error) {
					reject(error);
				} else if (result) {
					resolve({
						url: result.secure_url,
						publicId: result.public_id,
						width: result.width,
						height: result.height,
					});
				} else {
					reject(new Error("Upload failed: no result returned"));
				}
			}
		);

		uploadStream.end(imageBuffer);
	});
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
	await cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
