module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        // let Babel decide module transform for Jest runtime
        modules: 'auto'
      }
    ],
    '@babel/preset-typescript'
  ],
  plugins: ['@babel/plugin-transform-modules-commonjs']
};
