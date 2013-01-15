'use strict';

var EventEmitter = require("events").EventEmitter,
    util = require('util'),
    checker = require('./checker'),
    updater = require('./updater');

var modules = {
    checkers: {},
    updaters: {}
};

/**
 *
 * @param config
 * @constructor
 */
function Tracker(config) {
    this.config = config;
    var checkers = {};
    this.addChecker = function (checker) {
        checkers[checker.getName()] = checker;
        this.initListeners(checker);
        return this;
    };
    this.getChecker = function (name) {
        return checkers[name];
    };

    var modifiers = {};
    this.addModifier = function (name, modifiersList) {
        modifiers[name] = modifiersList;
        return this;
    };
    this.getModifier = function (name) {
        return modifiers[name];
    };

    var updaters = {};
    this.addUpdater = function (name, updater) {
        if (!updaters[name]) { updaters[name] = []; }
        updaters[name].push(updater);
        return this;
    };
    this.getUpdater = function (name) {
        return updaters[name];
    };

    var tracker = this;
    function dataUpdate(checker, data){ tracker.dataUpdate(checker, data); }
    this.initListeners = function (checker) {
        checker.on('dataUpdate', dataUpdate);
    };

    this.addCoreModules();
}

Tracker.prototype = new EventEmitter();
Tracker.constructor = Tracker;

/**
 *
 * @param name
 * @param module
 */
Tracker.prototype.addCheckerModule = function (name, module) {
    modules.checkers[name] = module;
};

/**
 *
 * @param name
 * @param module
 */
Tracker.prototype.addUpdaterModule = function (name, module) {
    modules.updaters[name] = module;
};

/**
 *
 */
Tracker.prototype.addCoreModules = function () {
    // checkers
    this.addCheckerModule('lastfm', require('./checker/lastfm'));
    // updaters
    this.addUpdaterModule('icecast', require('./updater/icecast'));
};

/**
 *
 * @param checker
 * @param data
 */
Tracker.prototype.dataUpdate = function (checker, data) {
    var modifiedData = this.modify(checker.getName(), data);
    this.emit('dataUpdate', checker.getName(), modifiedData);

    var updaters = this.getUpdater(checker.getName()) || [];
    var song = this.format(modifiedData);
    var i = updaters.length;
    for (; i--; ) {
        updaters[i].update(song);
    }
};

/**
 *
 * @param name
 * @param data
 * @return {*}
 */
Tracker.prototype.modify = function (name, data) {
    var result = data;
    var modifiersList = this.getModifier(name) || [];
    var i = modifiersList.length;
    for (; i--; ) {
        if (typeof modifiersList[i] !== 'function') { continue; }
        result = modifiersList[i](data);
    }
    return result;
};

/**
 *
 * @param data
 * @return {*}
 */
Tracker.prototype.format = function (data) {
    data = data || {};
    return util.format('%s - %s', data.artist, data.name);
};

/**
 *
 */
Tracker.prototype.start = function(){
    var streams = this.config || [];
    var i = streams.length;
    for (; i--; ) {
        var stream = streams[i];

        var modifiers = stream.modifiers || [];
        this.addModifier(stream.name, modifiers);

        var destinations = stream.destinations || [];
        var j = destinations.length;
        for (; j--; ) {
            var destination = destinations[j];
            var upd = updater.create(destination, modules.updaters);
            this.addUpdater(stream.name, upd);
        }

        var ch = checker.create(stream.source, modules.checkers);
        ch.setName(stream.name);
        this.addChecker(ch);
        ch.start();
    }
};

/**
 *
 * @param name
 * @return {*}
 */
Tracker.prototype.getCurrentTrack = function (name) {
    return this.getChecker(name).getCurrentTrack();
};

/**
 *
 * @param config
 * @return {Tracker}
 */
exports.create = function(config){
    return new Tracker(config);
};