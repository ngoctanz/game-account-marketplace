export const responseUtils = {
  success(res, data, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  },

  successWithMeta(res, data, meta, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      meta,
      message,
    });
  },

  error(res, message = "Error occurred", statusCode = 500, error = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(error && { error }),
    });
  },

  unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, 401);
  },

  forbidden(res, message = "Forbidden") {
    return this.error(res, message, 403);
  },

  notFound(res, message = "Not found") {
    return this.error(res, message, 404);
  },

  badRequest(res, message = "Bad request", error = null) {
    return this.error(res, message, 400, error);
  },

  conflict(res, message = "Conflict") {
    return this.error(res, message, 409);
  },

  validationError(res, errors) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors,
    });
  },
};
