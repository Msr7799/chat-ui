import type { ObjectId } from "mongodb";
import type { Timestamps } from "./Timestamps";
import type { User } from "./User";

export interface GeneratedVideo extends Timestamps {
	_id: ObjectId;
	userId: User["_id"];
	prompt: string;
	cloudinaryUrl: string;
	cloudinaryPublicId: string;
	modelUsed: string;
	mode: "text-to-video" | "image-to-video";
	operationName?: string;
	width?: number;
	height?: number;
	duration?: number;
}
