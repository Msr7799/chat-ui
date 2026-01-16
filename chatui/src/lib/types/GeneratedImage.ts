import type { ObjectId } from "mongodb";
import type { Timestamps } from "./Timestamps";
import type { User } from "./User";

export interface GeneratedImage extends Timestamps {
	_id: ObjectId;
	userId: User["_id"];
	prompt: string;
	cloudinaryUrl: string;
	cloudinaryPublicId: string;
	width?: number;
	height?: number;
	modelUsed: string; // e.g., "black-forest-labs/FLUX.1-schnell"
}
