const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    fallback: {
      path: require.resolve('path-browserify'),
      // json-schema-ref-parser only reads files in Node.js; its package.json maps fs to false for browsers
      fs: false,
    },
  },
  optimization: {
    minimizer: ['...', new CssMinimizerPlugin()],
  },
  module: {
    rules: [
      {
        // json-schema-ref-parser imports fs and Node's network modules with import(), by variable
        // name, and only calls them in Node.js. Keep fs in the bundle and skip the variable imports.
        test: /[\\/]node_modules[\\/]@apidevtools[\\/]json-schema-ref-parser[\\/]/,
        parser: {
          dynamicImportMode: 'eager',
          exprContextCritical: false,
          exprContextRegExp: /^$/,
        },
      },
      {
        test: /\.css$/i,
        include: path.resolve(__dirname, 'src'),
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js',
    }),
    new MiniCssExtractPlugin(),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9090,
  },
};
