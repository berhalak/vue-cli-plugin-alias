const path = require('path')

module.exports = (api, options) => {

    api.chainWebpack(config => {
        config.module
            .rule('vue')
            .use('vue-cli-plugin-alias')
            .loader(path.join(__dirname, 'dist', 'vue-alias-loader.js'));
    });
}