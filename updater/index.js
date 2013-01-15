exports.create = function (config, modules) {
    modules = modules || {};
    if (!modules[config.type]) {
        throw Error('No updater module for ' + config.type);
    }
    return modules[config.type].create(config.config);
};