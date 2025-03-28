import express from "express";
const articleRoute = express.Router();
import articleController from "../controllers/articleControler.js";
import { checkUserApiKey } from "../middlewares/auth.js";

// Create article
articleRoute.post("/create", checkUserApiKey, articleController.createArticle);

// Upload article
articleRoute.post(
  "/:articleId/upload",
  checkUserApiKey,
  articleController.uploadArticleContent
);

// Get recent articles
articleRoute.get("/", articleController.getArticleList);

// Get article statistic
articleRoute.get("/statistics", articleController.getArticleStatistics);

// Get a specific article
articleRoute.get("/:articleId", articleController.getArticleById);

// Update an article
articleRoute.patch(
  "/:articleId/update",
  checkUserApiKey,
  articleController.updateArticleById
);

// Delete an article
articleRoute.delete(
  "/:articleId",
  checkUserApiKey,
  articleController.deleteArticle
);

export default articleRoute;
