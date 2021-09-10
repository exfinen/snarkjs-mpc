import * as path from 'path'
import * as webpack from 'webpack'
import config from 'config'

const HtmlPlugin = require('html-webpack-plugin')

const projectId = config.get<string>("projectId")
const ceremonyId = config.get<string>("ceremonyId")
const circuitDirs = config.get<string[]>("circuitDirs")
const startTimeout = config.get<number>("timeout.start")
const contribTimeout = config.get<number>("timeout.contrib")
const pollInterval = config.get<number>("pollInterval")
const logWindowSize = config.get<number>("windowSize.logs")
const partiWindowSize = config.get<number>("windowSize.participants")
const maxContribRatio = config.get<number>("maxContribRatio")

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
    new webpack.DefinePlugin({
      __PROJECT_ID__: `"${projectId}"`,
      __CEREMONY_ID__: `"${ceremonyId}"`,
      __CIRCUIT_DIRS__: circuitDirs,
      __START_TIMEOUT__: startTimeout,
      __CONTRIB_TIMEOUT__: contribTimeout,
      __POLL_INTERVAL__: pollInterval,
      __LOG_WINDOW_SIZE__: logWindowSize,
      __PARTI_WINDOW_SIZE__: partiWindowSize,
      __MAX_CONTRIB_RATIO__: maxContribRatio,
    }),
  ],
}
