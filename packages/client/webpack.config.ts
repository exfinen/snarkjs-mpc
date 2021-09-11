import * as path from 'path'
import * as webpack from 'webpack'

const HtmlPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: ['@babel/polyfill', './src/index.tsx'],
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'index.js',
  },
  devServer: {
    static: path.join(__dirname, 'dist'),
	},
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          appendTsSuffixTo: [/\.vue$/],
        },
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.(jpg|png)$/,
        loader: 'url-loader',
        options: {
          esModule: false,
        }
      },
      {
        test: /\.css$/,
        loader: ['style-loader', 'css-loader'],
      },
    ],
  },
  node: {
    fs: "empty",
    child_process: 'empty',
    net: 'empty',
    dns: 'empty',
    tls: 'empty',
  },
  plugins: [
    new HtmlPlugin({
      template: 'src/public/index.html',
      favicon: 'src/public/ship.png',
    }),
    // new webpack.DefinePlugin({
    //   // __PROJECT_ID__: `"${projectId}"`,
    // }),
  ],
}
