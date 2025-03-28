import fetch from "node-fetch";
import { globalCache } from "../libs/cache.js";

export const checkUserApiKey = async (req, res, next) => {
  try {
    const { api_key: API_KEY } = req.headers;
    if (!API_KEY) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Try to get the user information from the cache first
    let userData = globalCache.get(API_KEY);
    if (userData) {
      console.log("Get user data from the cache", userData);
      req.auth = userData;
      next();
    }
    // If the user not found in the cache, try to validate via auth service
    const { AUTH_API_DOMAIN } = process.env;
    if (!AUTH_API_DOMAIN) throw Error("AUTH_API_DOMAIN is not set");
    const authApiEndpoint = `${AUTH_API_DOMAIN}/api/v1/users/current`;
    userData = await fetch(authApiEndpoint, {
      headers: { API_KEY },
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Unauthorized");
      }
      return response.json();
    });
    globalCache.set(API_KEY, userData);
    console.log("User data saved to the cache");
    req.auth = userData;
    next();
  } catch (error) {
    console.log("Error in checkUserApiKey", error?.stack);
    return res.status(401).json({ message: error?.message });
  }
};
