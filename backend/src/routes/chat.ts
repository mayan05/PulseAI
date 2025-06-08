import express from "express";
import { handleMockChat } from "../controllers/chatController";

const router = express.Router();

router.post("/", handleMockChat);

export default router;