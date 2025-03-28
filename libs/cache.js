import NodeCache from "node-cache";
import { createHash } from "crypto";

export const articleCountByKeywordCache = new NodeCache({
  stdTTL: process.env.DEFAULT_CACHE_TTL || 1000,
});

export const globalCache = new NodeCache({
  stdTTL: process.env.DEFAULT_CACHE_TTL || 1000,
});

export const articleListCache = new NodeCache({
  stdTTL: process.env.DEFAULT_CACHE_TTL || 1000,
});

export const articleDetailCache = new NodeCache({
  stdTTL: process.env.DEFAULT_CACHE_TTL || 1000,
});

export const getHashedQuery = (query = "") => {
  try {
    if (typeof query !== "string") query = JSON.stringify(query);
    return [createHash("md5").update(query).digest("hex"), null];
  } catch (error) {
    console.log("Error in getHashedQuery", error);
    return [null, error];
  }
};
