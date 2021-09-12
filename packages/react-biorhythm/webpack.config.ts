import * as path from "path"

const HtmlPlugin = require("html-webpack-plugin")

module.exports = {
  mode: "development",
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: 'index.js',
  },
  devServer: {
    static: path.join(__dirname, "dist"),
	},
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        enforce: "pre",
        use: ['source-map-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        loader: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlPlugin({
      template: './public/index.html',
    }),
  ],
}
