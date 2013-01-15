exports.create = function (config, modules) {
    modules = modules || {};
    if (!modules[config.type]) {
        throw Error('No checker module for ' + config.type);
    }
    return modules[config.type].create(config.config);
};