function ExtendExpressMethod(req, res, next) {
  res.success = (json) => {
    let result = { success: true };

    if (json) {
      result = {
        ...result,
        ...json,
      };
    }

    return res.json(result);
  };

  res.fail = (json) => {
    let result = { success: false };

    if (json) {
      result = {
        ...result,
        ...json,
      };
    }

    return res.json(result);
  };

  return next();
}

module.exports = ExtendExpressMethod;
