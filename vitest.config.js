module.exports = {
  test: {
    environment: "node",
    pool: "threads",
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
};
