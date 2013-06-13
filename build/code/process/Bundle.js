// Generated by CoffeeScript 1.6.3
var AlmondOptimizationTemplate, Build, Bundle, BundleBase, BundleFile, DependenciesReporter, Dependency, UError, UModule, UResource, debugLevelSkipTempDeletion, fs, globExpand, isFileInSpecs, l, minimatch, uRequireConfigMasterDefaults, upath, wrench, _, _B,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('lodash');

_.mixin((require('underscore.string')).exports());

fs = require('fs');

wrench = require('wrench');

_B = require('uberscore');

l = new _B.Logger('urequire/Bundle');

globExpand = require('glob-expand');

minimatch = require('minimatch');

upath = require('../paths/upath');

uRequireConfigMasterDefaults = require('../config/uRequireConfigMasterDefaults');

AlmondOptimizationTemplate = require('../templates/AlmondOptimizationTemplate');

Dependency = require('../Dependency');

DependenciesReporter = require('./../DependenciesReporter');

UError = require('../utils/UError');

BundleFile = require('./BundleFile');

UResource = require('./UResource');

UModule = require('./UModule');

Build = require('./Build');

BundleBase = require('./BundleBase');

isFileInSpecs = require('../utils/isFileInSpecs');

debugLevelSkipTempDeletion = 50;

/*
  @todo: doc it!
*/


Bundle = (function(_super) {
  var _this = this;

  __extends(Bundle, _super);

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
      _results.push(Object.defineProperty(Bundle.prototype, n, d));
    }
    return _results;
  };

  function Bundle() {
    this._constructor.apply(this, arguments);
  }

  Bundle.prototype._constructor = function(bundleCfg) {
    _.extend(this, bundleCfg);
    this.reporter = new DependenciesReporter();
    this.filenames = this.getGlobExpandFilez();
    return this.files = {};
  };

  Bundle.prototype.getGlobExpandFilez = function() {
    var _this = this;
    return _.filter(globExpand({
      cwd: this.path
    }, '**/*.*'), function(f) {
      return isFileInSpecs(f, _this.filez);
    });
  };

  Bundle.staticProperty({
    requirejs: {
      get: function() {
        return require('requirejs');
      }
    }
  });

  Bundle.property({
    uModules: {
      get: function() {
        return _.pick(this.files, function(file) {
          return file instanceof UModule;
        });
      }
    },
    uResources: {
      get: function() {
        return _.pick(this.files, function(file) {
          return file instanceof UResource;
        });
      }
    }
  });

  /*
    Processes each filename, either as array of filenames (eg instructed by `watcher`) or all @filenames
  
    If a filename is new, create a new BundleFile (or more interestingly a UResource or UModule)
  
    In any case, refresh() each one, either new or existing
  
    @param []<String> with filenames to process.
      @default ALL files from filesystem (property @filenames)
  
    @return Number of bundlefiles changed, i.e @change.bundlefiles
  */


  Bundle.prototype.loadOrRefreshResources = function(filenames) {
    var bundlefile, delMsgs, err, filename, isNew, matchedConverters, resourceClass, resourceConverter, sameDstFile, uerr, updateChanged, _i, _j, _len, _len1, _ref,
      _this = this;
    if (filenames == null) {
      filenames = this.filenames;
    }
    if (l.deb(30)) {
      l.debug("#####################################\nloadOrRefreshResources: filenames.length = " + filenames.length + "\n#####################################################################");
    }
    updateChanged = function() {
      _this.changed.bundlefiles++;
      if (bundlefile instanceof UResource) {
        _this.changed.resources++;
      }
      if (bundlefile instanceof UModule) {
        _this.changed.modules++;
      }
      if (bundlefile.hasErrors) {
        return _this.changed.errors++;
      }
    };
    for (_i = 0, _len = filenames.length; _i < _len; _i++) {
      filename = filenames[_i];
      isNew = false;
      if (!this.files[filename]) {
        isNew = true;
        matchedConverters = [];
        resourceClass = UModule;
        _ref = this.resources;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          resourceConverter = _ref[_j];
          if (isFileInSpecs(filename, resourceConverter.filez)) {
            matchedConverters.push(resourceConverter);
            if (resourceConverter.isModule === false) {
              resourceClass = UResource;
            }
            if (resourceConverter.isTerminal) {
              break;
            }
          }
        }
        if (_.isEmpty(matchedConverters)) {
          resourceClass = BundleFile;
        }
        if (l.deb(80)) {
          l.debug("New *" + resourceClass.name + "*: '" + filename + "'");
        }
        this.files[filename] = new resourceClass(this, filename, matchedConverters);
      } else {
        if (l.deb(80)) {
          l.debug("Refreshing existing resource: '" + filename + "'");
        }
      }
      bundlefile = this.files[filename];
      try {
        if (bundlefile.refresh()) {
          updateChanged();
        }
        if (isNew) {
          if (sameDstFile = _.find(this.files, function(f) {
            return f.dstFilename === bundlefile.dstFilename && f !== bundlefile;
          })) {
            l.err(uerr = "Same dstFilename '" + sameDstFile.dstFilename + "' for '" + bundlefile.filename + "' & '" + sameDstFile.filename + "'");
            bundlefile.hasErrors = true;
            throw new UError(uerr);
          }
        }
      } catch (_error) {
        err = _error;
        if (!fs.existsSync(bundlefile.srcFilepath)) {
          delMsgs = ["Missing file: ", bundlefile.srcFilepath, "\n  Removing bundle file: ", filename];
          if (bundlefile.dstExists) {
            delMsgs.push("\n  Deleting build in dstPath: " + bundlefile.dstFilepath);
          }
          l.verbose.apply(l, delMsgs);
          if (bundlefile.dstExists) {
            try {
              fs.unlinkSync(bundlefile.dstFilepath);
            } catch (_error) {
              err = _error;
              l.err("Cant delete destination file '" + bundlefile.dstFilepath + "'.");
            }
          } else {
            l.err("No dstFilepath / dstExists for '" + filename + "'.");
          }
          delete this.files[filename];
        } else {
          l.err(uerr = "Something wrong while loading/refreshing/processing '" + filename + "'.");
          uerr = new UError(uerr, {
            nested: err
          });
          if (!(this.build["continue"] || this.build.watch)) {
            l.log(uerr);
            throw uerr;
          } else {
            l.err("Continuing from error due to @build.continue || @build.watch - not throwing:\n", uerr);
          }
        }
      }
    }
    this.filenames = _.keys(this.files);
    this.dstFilenames = _.map(this.files, function(file) {
      return file.dstFilename;
    });
    return this.changed.bundlefiles;
  };

  /*
    build / convert all resources that have changed since last
  */


  Bundle.prototype.buildChangedResources = function(build, filenames) {
    var bundleFilenames, copied, diff, file, filename, fn, forceFullBuild, partialWarns, report, uModule, w, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2,
      _this = this;
    this.build = build;
    if (filenames == null) {
      filenames = this.filenames;
    }
    if (l.deb(30)) {
      l.debug("#####################################\nbuildChangedResources: filenames.length = " + filenames.length + "\n#####################################################################");
    }
    this.changed = {
      bundlefiles: 0,
      resources: 0,
      modules: 0,
      errors: 0
    };
    this.isPartialBuild = filenames !== this.filenames;
    this.reporter = new DependenciesReporter();
    if (this.isPartialBuild) {
      bundleFilenames = _.filter(filenames, function(f) {
        return isFileInSpecs(f, _this.filez);
      });
      if (diff = filenames.length - bundleFilenames.length) {
        l.verbose("Ignored " + diff + " non bundle.filez");
        filenames = bundleFilenames;
      }
    }
    if (filenames.length > 0) {
      if ((this.build.template.name === 'combined') && (!this.build.combinedFile)) {
        this.build.combinedFile = upath.changeExt(this.build.dstPath, '.js');
        this.build.dstPath = "" + this.build.combinedFile + "__temp";
        if (l.deb(30)) {
          l.debug("Setting @build.combinedFile =", this.build.combinedFile, '\n  and @build.dstPath = ', this.build.dstPath);
        }
      }
      if (this.loadOrRefreshResources(filenames) > 0) {
        if (this.changed.modules) {
          if (l.deb(30)) {
            l.debug("#####################################\nConverting changed modules with template '" + this.build.template.name + "'\n#####################################################################");
          }
          for (_i = 0, _len = filenames.length; _i < _len; _i++) {
            filename = filenames[_i];
            if (uModule = this.files[filename]) {
              if (uModule.hasChanged && (uModule instanceof UModule)) {
                uModule.convert(this.build);
              }
            }
          }
        }
        if (!this.isPartialBuild) {
          this.hasFullBuild = true;
        } else {
          if ((!this.hasFullBuild) && this.changed.resources) {
            forceFullBuild = false;
            partialWarns = ["Partial build, without a previous full build."];
            if (fs.existsSync(this.build.dstPath) && (l.deb(debugLevelSkipTempDeletion) || this.build.watch)) {
              _ref = ["\nNOT PERFORMING a full build cause fs.exists(@build.dstPath)", this.build.dstPath, "\nand (@build.watch or debugLevel >= " + debugLevelSkipTempDeletion + " or @build.template.name isnt 'combined')"];
              for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
                w = _ref[_j];
                partialWarns.push(w);
              }
            } else {
              if (this.build.template.name === 'combined') {
                _ref1 = ["on 'combined' template.", "\nForcing a full build of all module to __temp directory: ", this.build.dstPath];
                for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
                  w = _ref1[_k];
                  partialWarns.push(w);
                }
                forceFullBuild = true;
              }
            }
            if (forceFullBuild) {
              filenames = this.filenames;
              this.hasFullBuild = true;
              _ref2 = this.files;
              for (fn in _ref2) {
                file = _ref2[fn];
                file.reset();
              }
              if (this.build.watch) {
                partialWarns.push("\nNote on watch: NOT DELETING ...__temp - when you quit 'watch'-ing, delete it your self!");
                debugLevelSkipTempDeletion = 0;
              }
              l.warn.apply(l, partialWarns);
              this.buildChangedResources(this.build, this.getGlobExpandFilez());
              return;
            } else {
              partialWarns.push("\n\nNote: other modules info not available: falsy errors possible, including :\n  * `Bundle-looking dependencies not found in bundle`\n  * requirejs.optmize crashing, not finding some global var etc.\nBest advice: a full fresh build first, before watch-ing.");
              l.warn.apply(l, partialWarns);
            }
          }
        }
        this.saveChangedResources();
      }
      copied = this.copyNonResourceFiles(filenames);
      report = this.reporter.getReport(this.build.interestingDepTypes);
      if (!_.isEmpty(report)) {
        l.warn('Report for this `build`:\n', report);
      }
      if (copied) {
        l.verbose("Copied " + copied + " files.");
      }
      l.verbose("Changed & built: " + this.changed.resources + " resources of which " + this.changed.modules + " were modules.");
      if (this.changed.errors) {
        l.err("" + this.changed.errors + " files/resources with errors in this build.");
      }
    }
    if (this.build.template.name === 'combined') {
      if (this.changed.modules) {
        return this.combine(this.build);
      } else {
        l.debug(30, "Not executing *'combined' template optimizing with r.js*: no @modulesChanged.");
        return this.build.done(!this.changed.errors);
      }
    } else {
      return this.build.done(!this.changed.errors);
    }
  };

  Bundle.prototype.saveChangedResources = function() {
    var fn, resource, _ref, _results;
    if (this.changed.resources) {
      if (l.deb(30)) {
        l.debug("#####################################\nSaving changed resource files\n#####################################################################");
      }
      _ref = this.uResources;
      _results = [];
      for (fn in _ref) {
        resource = _ref[fn];
        if (!resource.hasChanged) {
          continue;
        }
        if (_.isFunction(this.build.out)) {
          this.build.out(resource.dstFilepath, resource.converted);
        }
        _results.push(resource.hasChanged = false);
      }
      return _results;
    }
  };

  Bundle.prototype.copyNonResourceFiles = function(filenames) {
    var copyNonResFilenames, err, fn, _i, _len,
      _this = this;
    if (filenames == null) {
      filenames = this.filenames;
    }
    if (this.changed.bundlefiles) {
      if (!_.isEmpty(this.copy)) {
        copyNonResFilenames = _.filter(filenames, function(fn) {
          var _ref;
          return !(_this.files[fn] instanceof UResource) && ((_ref = _this.files[fn]) != null ? _ref.hasChanged : void 0) && (isFileInSpecs(fn, _this.copy));
        });
      }
      if (!_.isEmpty(copyNonResFilenames)) {
        if (l.deb(30)) {
          l.debug("#####################################\nCopying " + copyNonResFilenames.length + " non-resources files...\"\n#####################################################################");
        }
        for (_i = 0, _len = copyNonResFilenames.length; _i < _len; _i++) {
          fn = copyNonResFilenames[_i];
          try {
            Build.copyFileSync(this.files[fn].srcFilepath, this.files[fn].dstFilepath);
            this.files[fn].hasChanged = false;
          } catch (_error) {
            err = _error;
            if (!(this.build["continue"] || this.build.watch)) {
              throw err;
            }
          }
        }
      }
    }
    return (copyNonResFilenames != null ? copyNonResFilenames.length : void 0) || 0;
  };

  /*
  */


  Bundle.prototype.combine = function(build) {
    var almondTemplates, depfilename, err, genCode, globalDepsVars, mainCand, mainModule, nodeOnly, rjsConfig, _i, _len, _ref, _ref1,
      _this = this;
    this.build = build;
    if (l.deb(30)) {
      l.debug("#####################################\n'combined' template: optimizing with r.js\n#####################################################################");
    }
    if (!this.main) {
      _ref = [this.name, 'index', 'main'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mainCand = _ref[_i];
        if (!(mainCand && !mainModule)) {
          continue;
        }
        mainModule = _.find(this.uModules, function(m) {
          return m.modulePath === mainCand;
        });
        if (mainModule) {
          this.main = mainModule.modulePath;
          l.warn("combine() note: 'bundle.main', your *entry-point module* was missing from bundle config(s).\nIt's defaulting to " + (this.main === this.name ? 'bundle.name = ' : '') + "'" + this.main + "', as uRequire found an existing '" + this.path + "/" + mainModule.filename + "' module in your path.");
        }
      }
    }
    if (!this.main) {
      l.err("Quiting cause 'bundle.main' is missing (after so much effort).\nNo module found either as name = '" + this.name + "', nor as ['index', 'main'].");
      this.build.done(false);
    } else {
      globalDepsVars = this.getDepsVars(function(dep) {
        return (dep.type === Dependency.TYPES.global) && (dep.pluginName !== 'node');
      });
      l.log('globalDepsVars=', globalDepsVars);
      if (_.any(globalDepsVars, function(v) {
        return _.isEmpty(v);
      }) && false) {
        l.err("Some global dependencies are missing a variable binding:\n\n" + (l.prettify(_B.go(globalDepsVars, {
          fltr: function(v) {
            return _.isEmpty(v);
          }
        }))) + "\n\nThese variable names are used to grab the dependency from the global object, when running as <script>.\nEg. 'jquery' corresponds to '$' or 'jQuery', hence it should be known as `jquery: ['$', 'jQuery']`\n\nRemedy:\n\nYou should add it at uRequireConfig 'bundle.dependencies.depsVars' as:\n  ```\n    depsVars: {\n      'myDep1': 'VARIABLE_IT_BINDS_WITH',\n      'myDep2': ['VARIABLE_IT_BINDS_WITH', 'ANOTHER VARIABLE_IT_BINDS_WITH']\n    }\n  ```\nAlternativelly, pick one medicine :\n  - define at least one module that has this dependency + variable binding (currently using AMD only) and uRequire will find it!\n  - use an `rjs.shim`, and uRequire will pick it from there (@todo: NOT IMPLEMENTED YET!)\n  - RTFM & let us know if still no remedy!");
        this.changed.errors++;
        if (!(this.build.watch || this.build["continue"])) {
          this.build.done(false);
          return;
        } else {
          l.err("Continuing from error due to @build.continue || @build.watch - not throwing:\n", uerr);
        }
      }
      nodeOnly = _.keys(this.getDepsVars(function(dep) {
        return dep.pluginName === 'node';
      }));
      almondTemplates = new AlmondOptimizationTemplate({
        globalDepsVars: globalDepsVars,
        nodeOnly: nodeOnly,
        main: this.main
      });
      _ref1 = almondTemplates.dependencyFiles;
      for (depfilename in _ref1) {
        genCode = _ref1[depfilename];
        Build.outputToFile(upath.join(this.build.dstPath, depfilename + '.js'), genCode);
      }
      this.copyAlmondJs();
      this.copyWebMapDeps();
      try {
        fs.unlinkSync(this.build.combinedFile);
      } catch (_error) {
        err = _error;
      }
      rjsConfig = {
        paths: _.extend(almondTemplates.paths, this.getRequireJSConfig().paths),
        wrap: almondTemplates.wrap,
        baseUrl: this.build.dstPath,
        include: [this.main],
        deps: nodeOnly,
        out: this.build.combinedFile,
        name: 'almond'
      };
      if (rjsConfig.optimize = this.build.optimize) {
        rjsConfig[this.build.optimize] = this.build[this.build.optimize];
      } else {
        rjsConfig.optimize = "none";
      }
      if (l.deb(90)) {
        rjsConfig.logLevel = 0;
      }
      l.verbose("Optimize with r.js (v" + this.requirejs.version + ") with uRequire's 'build.js' = \n", _.omit(rjsConfig, ['wrap']));
      try {
        this.requirejs.optimize(_.clone(rjsConfig, true), function(buildResponse) {
          return l.verbose('@requirejs.optimize rjsConfig, (buildResponse)-> = ', buildResponse);
        });
      } catch (_error) {
        err = _error;
        err.uRequire = "Error optimizing with r.js (v" + this.requirejs.version + ")";
        l.err(err);
      }
      return setTimeout((function() {
        l.debug(60, 'Checking r.js output file...');
        if (fs.existsSync(build.combinedFile)) {
          l.verbose("Combined file '" + build.combinedFile + "' written successfully.");
          globalDepsVars = _this.getDepsVars(function(dep) {
            return dep.depType === 'global';
          });
          if (!_.isEmpty(globalDepsVars)) {
            if ((!build.watch && !build.verbose) || l.deb(30)) {
              l.log("Global bindinds: make sure the following global dependencies:\n", globalDepsVars, "\n\nare available when combined script '" + build.combinedFile + "' is running on:\n\na) nodejs: they should exist as a local `nodes_modules`.\n\nb) Web/AMD: they should be declared as `rjs.paths` (or `rjs.baseUrl`)\n\nc) Web/Script: the binded variables (eg '_' or '$')\n   must be a globally loaded (i.e `window.$`) BEFORE loading '" + build.combinedFile + "'");
            }
          }
          if (!(l.deb(debugLevelSkipTempDeletion) || build.watch)) {
            l.debug(40, "Deleting temporary directory '" + build.dstPath + "'.");
            wrench.rmdirSyncRecursive(build.dstPath);
          } else {
            l.debug("NOT Deleting temporary directory '" + build.dstPath + "', due to build.watch || debugLevel >= " + debugLevelSkipTempDeletion + ".");
          }
          return build.done(!_this.changed.errors);
        } else {
          l.err("Combined file '" + build.combinedFile + "' NOT written.\"\n\n  Some remedy:\n\n   a) Is your *bundle.main = '" + _this.main + "'* or *bundle.name = '" + _this.name + "'* properly defined ?\n      - 'main' should refer to your 'entry' module, that requires all other modules - if not defined, it defaults to 'name'.\n      - 'name' is what 'main' defaults to, if its a module.\n\n   b) Perhaps you have a missing dependcency ?\n      r.js doesn't like this at all, but it wont tell you unless logLevel is set to error/trace, which then halts execution.\n\n   c) Re-run uRequire with debugLevel >=90, to enable r.js's logLevel:0 (trace).\n      *Note this prevents uRequire from finishing properly / printing this message!*\n\n   Note that you can check the AMD-ish files used in temporary directory '" + build.dstPath + "'.\n\n   More remedy on the way... till then, you can try running r.js optimizer your self, based on the following build.js: \u001b[0m\n", rjsConfig);
          return build.done(false);
        }
      }), 100);
    }
  };

  Bundle.prototype.getRequireJSConfig = function() {
    return {
      paths: {
        text: "requirejs_plugins/text",
        json: "requirejs_plugins/json"
      }
    };
  };

  Bundle.prototype.copyAlmondJs = function() {
    var err, uerr;
    try {
      return Build.copyFileSync("" + __dirname + "/../../../node_modules/almond/almond.js", upath.join(this.build.dstPath, 'almond.js'));
    } catch (_error) {
      err = _error;
      l.err(uerr = "uRequire: error copying almond.js from uRequire's installation node_modules - is it installed ?\nTried: '" + __dirname + "/../../../node_modules/almond/almond.js'");
      uerr = new UError(uerr, {
        nested: err
      });
      if (!(this.build["continue"] || this.build.watch)) {
        throw uerr;
      } else {
        return l.err("Continuing from error due to @build.continue || @build.watch - not throwing:\n", uerr);
      }
    }
  };

  /*
   Copy all bundle's webMap dependencies to dstPath
   @todo: use path.join
   @todo: should copy dep.plugin & dep.resourceName separatelly
  */


  Bundle.prototype.copyWebMapDeps = function() {
    var depName, webRootDeps, _i, _len, _results;
    webRootDeps = _.keys(this.getDepsVars(function(dep) {
      return dep.depType === Dependency.TYPES.webRootMap;
    }));
    if (!_.isEmpty(webRootDeps)) {
      l.verbose("Copying webRoot deps :\n", webRootDeps);
      _results = [];
      for (_i = 0, _len = webRootDeps.length; _i < _len; _i++) {
        depName = webRootDeps[_i];
        _results.push(l.err("NOT IMPLEMENTED: Build.copyFileSync  " + this.webRoot + depName + ", " + this.build.dstPath + depName));
      }
      return _results;
    }
  };

  /*
  Gets dependencies & the variables (they bind with), througout this bundle.
  
  The information is gathered from all modules and joined together.
  
  Also it uses bundle.dependencies.depsVars, _knownDepsVars, exports.bundle & exports.root
  to discover var bindings, if some dep has no corresponding vars [].
  
  @param {Object} q optional query with 3 optional fields : depType, depName & pluginName
  
  @return {dependencies.depsVars} `dependency: ['var1', 'var2']` eg
              {
                  'underscore': ['_']
                  'jquery': ["$", "jQuery"]
                  'models/PersonModel': ['persons', 'personsModel']
              }
  */


  Bundle.prototype.getDepsVars = function(depFltr) {
    var dependenciesDepsVars, dependenciesDepsVarsPath, depsVars, gatherDepsVars, getMissingDeps, uMK, uModule, vn, _i, _len, _ref, _ref1,
      _this = this;
    depsVars = {};
    gatherDepsVars = function(_depsVars) {
      var dep, dv, v, vars, _results;
      _results = [];
      for (dep in _depsVars) {
        vars = _depsVars[dep];
        dv = (depsVars[dep] || (depsVars[dep] = []));
        _results.push((function() {
          var _i, _len, _results1;
          _results1 = [];
          for (_i = 0, _len = vars.length; _i < _len; _i++) {
            v = vars[_i];
            if (__indexOf.call(dv, v) < 0) {
              _results1.push(dv.push(v));
            }
          }
          return _results1;
        })());
      }
      return _results;
    };
    _ref = this.uModules;
    for (uMK in _ref) {
      uModule = _ref[uMK];
      gatherDepsVars(uModule.getDepsVars(depFltr));
    }
    getMissingDeps = function(fromDepsVars) {
      return _B.go(fromDepsVars, {
        fltr: function(v, k) {
          return (depsVars[k] !== void 0) && _.isEmpty(depsVars[k]);
        }
      });
    };
    _ref1 = _.map(['depsVars', '_knownDepsVars', 'exports.bundle', 'exports.root'], function(v) {
      return 'dependencies.' + v;
    });
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      dependenciesDepsVarsPath = _ref1[_i];
      dependenciesDepsVars = _B.getp(this, dependenciesDepsVarsPath, {
        separator: '.'
      });
      if (!_.isEmpty(vn = getMissingDeps(dependenciesDepsVars))) {
        l.warn("\n Picked from `@" + dependenciesDepsVarsPath + "` for some deps with missing dep-variable bindings: \n", dependenciesDepsVars);
        gatherDepsVars(dependenciesDepsVars);
      }
    }
    return depsVars;
  };

  return Bundle;

}).call(this, BundleBase);

module.exports = Bundle;
