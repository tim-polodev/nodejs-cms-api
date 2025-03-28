import Articles from "../models/articles.model.js";
import { generatePresignedUrl } from "../libs/minio.js";
import { allowedFileExtensions } from "../consts/index.js";
import pick from "lodash";
import {
  articleUpdateSchema,
  getArticleListSchema,
  getArticleStatSchema,
} from "./articlesValidationSchema.js";
import {
  articleListCache,
  getHashedQuery,
  articleCountByKeywordCache,
  articleDetailCache,
} from "../libs/cache.js";
import { Op } from "sequelize";
import path from "path";
import moment from "moment";
import { makeResponse } from "../utils/index.js";

const articlesController = {
  // TODO: Filter by status of the article, must be ADMIN and require access key to access article with status !== 'published'
  getArticleList: async (req, res) => {
    try {
      let queryParam;
      try {
        queryParam = await getArticleListSchema.validate(req.query);
      } catch (error) {
        return res
          .status(400)
          .json({ message: "Bad request", error: error.message });
      }
      // Check if the article list in the cache
      const [articleListCacheQuery, hashError] = getHashedQuery(queryParam);
      if (hashError) {
        return res
          .status(500)
          .json({ message: "Something went wrong", error: hashError });
      }
      if (!hashError && articleListCacheQuery) {
        const cachedArticleList = articleListCache.get(articleListCacheQuery);
        if (cachedArticleList) {
          return res.status(200).json(cachedArticleList);
        }
      }
      const {
        page,
        pageSize,
        keywords,
        sortby = "created_at",
        sorttype = "DESC",
      } = queryParam;
      const { MINIO_ENDPOINT, CMS_DATA_MINIO_BUCKET_NAME } = process.env;
      const limit = parseInt(pageSize); // Number of records per page
      const offset = (parseInt(page) - 1) * limit; // Calculate offset
      const now = moment().toDate();
      let whereClauses = {
        [Op.and]: [
          {
            publish_on: {
              [Op.lte]: now,
            },
          },
          {
            [Op.or]: [{ publish_to: { [Op.gte]: now } }, { publish_to: null }],
          },
        ],
        status: "published",
      };

      const filterByKeywords = !!keywords?.length;
      if (filterByKeywords) {
        whereClauses[Op.and].push({
          keywords: { [Op.contains]: keywords.split(",") },
        });
      }
      const { count, rows } = await Articles.findAndCountAll({
        limit,
        offset,
        raw: true,
        order: [[sortby, sorttype]],
        where: whereClauses,
      });
      const response = {
        totalArticles: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        data: rows.map((article) => {
          return {
            ...article,
            thumbnail: `https://${MINIO_ENDPOINT}/${CMS_DATA_MINIO_BUCKET_NAME}/${article.id}/thumbnail.png`,
          };
        }),
      };
      // Add to cache
      articleListCache.set(articleListCacheQuery, response);
      res.status(200).json(response);
    } catch (error) {
      console.error("Error in getArticleList", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },
  getArticleById: async (req, res) => {
    try {
      const { MINIO_ENDPOINT, CMS_DATA_MINIO_BUCKET_NAME } = process.env;
      const { articleId } = req.params;
      if (!articleId) {
        return res.status(400).json({ message: "Missing article id param" });
      }
      const cachedInfo = articleDetailCache.get(articleId);
      if (cachedInfo) {
        return res.status(200).json(cachedInfo);
      }
      // Check if the articleInfo available in the cache
      await Articles.findByPk(articleId)
        .then((article) => {
          if (!article) {
            return res.status(404).json({ message: "Article not found" });
          }
          const response = {
            ...pick(article.dataValues, [
              "id",
              "title",
              "keywords",
              "created_at",
              "updated_at",
            ]).__wrapped__,
            // This is the default main content that served from minio
            // TODO: Make this more flexible
            content: `https://${MINIO_ENDPOINT}/${CMS_DATA_MINIO_BUCKET_NAME}/${articleId}/content.md`,
            thumbnail: `https://${MINIO_ENDPOINT}/${CMS_DATA_MINIO_BUCKET_NAME}/${articleId}/thumbnail.png`,
          };
          articleDetailCache.set(articleId, response);
          return res.status(200).json(response);
        })
        .catch((e) => {
          throw e;
        });
    } catch (error) {
      console.error("Error in getArticleById", error?.stack);
      res.status(500).json({ message: "Something went wrong" });
    }
  },
  createArticle: async (req, res) => {
    try {
      const { title, description, keywords } = req.body;
      const newArticle = await Articles.create({
        title,
        description,
        keywords,
      });
      return res.status(200).json(newArticle);
    } catch (error) {
      console.error("Error in createArticle", error?.stack);
      return res.status(500).json({ message: "Something went wrong" });
    }
  },
  uploadArticleContent: async (req, res) => {
    try {
      const { CMS_DATA_MINIO_BUCKET_NAME: cmsDataBucketName } = process.env;
      const { articleId } = req.params;
      // User can upload mutiple files
      const { files } = req.body;
      let response = {};
      // Validate files extension
      files.forEach((fileName) => {
        const fileExtension = path.extname(fileName);
        if (!allowedFileExtensions.includes(fileExtension)) {
          return res.status(400).json({
            message: `File type: ${fileExtension} is not allowed for upload`,
          });
        }
      });
      let promises = [];
      for (const fileName of files) {
        const fileKey = `${articleId}/${fileName}`;
        promises.push(
          generatePresignedUrl(cmsDataBucketName, fileKey).then(
            (presignedUrl) => {
              response[fileName] = presignedUrl;
            },
          ),
        );
      }
      await Promise.all(promises);
      return res.status(200).json({ data: response });

      // With each files, generate a presigned url for it
    } catch (error) {
      console.error("Error in uploadArticleContent", error?.stack);
      res.status(500).json({ message: "Something went wrong" });
    }
  },
  getArticleStatistics: async (req, res) => {
    try {
      let queries;
      try {
        queries = await getArticleStatSchema.validate(req.query);
      } catch (error) {
        return res.status(400).json({ message: "Bad request" });
      }
      const keywords = queries.keywords.split(",");
      const response = makeResponse(
        articleCountByKeywordCache.mget(keywords),
        true,
      );
      res.status(200).json(response);
    } catch (error) {
      console.error("Error in getArticleStatistics", error?.stack);
      res.status(500).json(makeResponse(null, false, "Something went wrong"));
    }
  },
  updateArticleById: async (req, res) => {
    try {
      let body;
      const { articleId } = req.params;
      try {
        if (!articleId) {
          throw Error("Missing article id");
        }
        body = await articleUpdateSchema.validate(req.body);
      } catch (error) {
        console.error(error);
        return res.status(400).json({ message: "Bad request" });
      }
      // Find the article with id
      const article = await Articles.findByPk(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      // Update the article metadata
      const response = await Articles.update(
        { ...body, updated_at: Date.now() },
        {
          where: { id: articleId },
          returning: true,
        },
      );
      return res.status(200).json({
        data: pick(response[1][0].dataValues, [
          "id",
          "title",
          "description",
          "keywords",
          "created_at",
          "updated_at",
        ]),
      });
    } catch (error) {
      console.error("Error in updateArticleById", error?.stack);
      res.status(500).json({ message: "Something went wrong" });
    }
  },
  deleteArticle: async () => {
    try {
      const { articleId } = req.params;
      const article = await Articles.findByPk(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      await Articles.destroy({ where: { id: articleId } });
    } catch (error) {
      console.error("Error in deleteArticle", error?.stack);
      res.status(500).json({ message: "Something went wrong" });
    }
  },
};

export default articlesController;
