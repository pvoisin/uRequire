// Generated by CoffeeScript 1.6.2
var Build, DependenciesReporter, YADC, l, uRequireConfigMasterDefaults, upath, _, _B, _fs, _wrench;

_ = require('lodash');

_fs = require('fs');

_wrench = require('wrench');

_B = require('uberscore');

l = new _B.Logger('Build');

upath = require('../paths/upath');

DependenciesReporter = require('./../DependenciesReporter');

uRequireConfigMasterDefaults = require('../config/uRequireConfigMasterDefaults');

module.exports = Build = (function() {
  var _this = this;

  Function.prototype.property = function(p) {
    var d, n, _results;

    _results = [];
    for (n in p) {
      d = p[n];
      _results.push(Object.defineProperty(this.prototype, n, d));
    }
    return _results;
  };

  Function.prototype.staticProperty = function(p) {
    var d, n, _results;

    _results = [];
    for (n in p) {
      d = p[n];
      _results.push(Object.defineProperty(Build.prototype, n, d));
    }
    return _results;
  };

  function Build() {
    this._constructor.apply(this, arguments);
  }

  Build.prototype._constructor = function(buildCfg) {
    var idp;

    _.extend(this, _B.deepCloneDefaults(buildCfg, uRequireConfigMasterDefaults.build));
    if (!this.out) {
      this.out = Build.outputModuleToFile;
    }
    return this.interestingDepTypes = this.verbose ? DependenciesReporter.prototype.reportedDepTypes : (idp = ['notFoundInBundle', 'untrustedRequireDependencies', 'untrustedAsyncDependencies'], this.template.name === 'combined' ? idp.push('global') : void 0, idp);
  };

  Build.templates = ['UMD', 'AMD', 'nodejs', 'combined'];

  Build.moduleExtensions = ['js', 'javascript', 'coffee'];

  Build.outputModuleToFile = function(modulePath, content) {
    return Build.outputToFile(upath.join(this.outputPath, "" + modulePath + ".js"), content);
  };

  Build.outputToFile = function(outputFilename, content) {
    var err;

    if (l.deb(5)) {
      l.debug("Writting file ", outputFilename, content.length, ' chars');
    }
    try {
      if (!_fs.existsSync(upath.dirname(outputFilename))) {
        l.verbose("Creating directory '" + (upath.dirname(outputFilename)) + "'");
        _wrench.mkdirSyncRecursive(upath.dirname(outputFilename));
      }
      _fs.writeFileSync(outputFilename, content, 'utf-8');
      if (this.watch) {
        return l.verbose("Written file '" + outputFilename + "'");
      }
    } catch (_error) {
      err = _error;
      err.uRequire = "uRequire: error outputToFile '" + outputFilename + "'";
      l.err(err.uRequire);
      throw err;
    }
  };

  Build.copyFileSync = function(srcFile, destFile) {
    var BUF_LENGTH, buff, bytesRead, err, fdr, fdw, pos;

    if (l.deb(30)) {
      l.debug("copyFileSync {src='" + srcFile + "', dst='" + destFile + "'");
    }
    try {
      BUF_LENGTH = 64 * 1024;
      buff = new Buffer(BUF_LENGTH);
      fdr = _fs.openSync(srcFile, 'r');
      if (!(_fs.existsSync(upath.dirname(destFile)))) {
        l.verbose("Creating directory " + (upath.dirname(destFile)));
        _wrench.mkdirSyncRecursive(upath.dirname(destFile));
      }
      fdw = _fs.openSync(destFile, 'w');
      bytesRead = 1;
      pos = 0;
      while (bytesRead > 0) {
        bytesRead = _fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
        _fs.writeSync(fdw, buff, 0, bytesRead);
        pos += bytesRead;
      }
      _fs.closeSync(fdr);
      return _fs.closeSync(fdw);
    } catch (_error) {
      err = _error;
      err.uRequire = "uRequire: error copyFileSync from '" + srcFile + "' to '" + destFile + "'";
      l.err(err.uRequire);
      throw err;
    }
  };

  return Build;

}).call(this);

if (_B.Logger.debugLevel > 90) {
  YADC = require('YouAreDaChef').YouAreDaChef;
  YADC(Build).before(/_constructor/, function(match, buildCfg) {
    return l.debug("Before '" + match + "' with buildCfg = \n", _.omit(buildCfg, []));
  });
}