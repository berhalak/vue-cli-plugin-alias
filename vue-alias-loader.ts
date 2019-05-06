const alias = require('./vue-alias');

module.exports = function (source : string) {
	return alias.rewrite(source);
};