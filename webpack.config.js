const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { exec } = require("child_process");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
  watchOptions: {
    ignored: ["**/*.swp", "**/~*", "**/.#*"], // Ignorer les fichiers temporaires courants
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "dist/index.js"),
          to: path.resolve(__dirname, "dist"),
          toType: "dir",
          noErrorOnMissing: true,
          transform(content, path) {
            // Using pbcopy to copy file content to clipboard
            exec(`cat "${path}" | pbcopy`);
            return content;
          },
        },
      ],
    }),
  ],
};
