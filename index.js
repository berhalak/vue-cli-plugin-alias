const path = require('path')

module.exports = (api, options) => {

    api.chainWebpack(config => {
        config.module
            .rule('vue')
            .use('vue-cli-plugin-alias')
            .loader(path.join(__dirname, 'lib', 'vue-alias-loader', 'vue-alias-loader.js'));
    });
}