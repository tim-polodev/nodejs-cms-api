export const makeResponse = (responseBody = null, success, message = "") => {
  return {
    success,
    data: responseBody,
    message:
      !message && success
        ? "Success"
        : !message && !message
        ? "Failed"
        : message,
  };
};
