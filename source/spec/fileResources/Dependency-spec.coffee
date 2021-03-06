_ = (_B = require 'uberscore')._
l = new _B.Logger 'uRequire/Dependency-spec'

chai = require 'chai'
expect = chai.expect
{ equal, notEqual, ok, notOk, tru, fals, deepEqual, notDeepEqual, exact, notExact, iqual, notIqual
  ixact, notIxact, like, notLike, likeBA, notLikeBA, equalSet, notEqualSet } = require '../specHelpers'

MasterDefaultsConfig = require '../../code/config/MasterDefaultsConfig'
Dependency = require "../../code/fileResources/Dependency"

# replace depStrings @ indexes with a String() having 'untrusted:true` property
untrust = (indexes, depsStrings)->
  for idx in indexes
    depsStrings[idx] = new String depsStrings[idx]
    depsStrings[idx].untrusted = true
    depsStrings[idx].inspect = -> @toString() + ' (untrusted in test)'
  depsStrings

describe "Dependency:", ->

  describe "init & and extracting data:", ->

    it "split plugin, extension, resourceName & recostruct as String", ->
      dep = new Dependency depString = 'somePlugin!somedir//dep.js'

      expect(dep.pluginName).to.equal 'somePlugin'
      expect(dep.extname).to.equal '.js'
      expect(dep.name()).to.equal 'somePlugin!somedir/dep' #.js ?
      expect(dep.toString()).to.equal depString
      expect(dep.name plugin:no, ext:no ).to.equal 'somedir/dep'

    it "'node' is not considered a plugin - its just a flag", ->
      dep = new Dependency depString = 'node!somedir/dep.js'

      expect(dep.pluginName).to.equal 'node'
      expect(dep.name()).to.equal 'somedir/dep' #.js
      expect(dep.toString()).to.equal depString
      expect(dep.depString).to.equal depString
      expect(dep.name plugin:true, ext:true).to.equal 'somedir/dep.js'

  describe "uses module.path & bundle.dstFilenames:", ->

    describe "converts from (unormalized) fileRelative to bundleRelative:", ->
      dep = new Dependency(
        depString = './.././../../rootdir//dep'         # original non-normalized dependency name
        {
          path: './path/from/bundleroot/module.path.js'  # the module that has this dependenecy
          bundle: dstFilenames: ['rootdir/dep.js']     # module files in bundle
        }
      )

      it "knows basic dep data", ->
        expect(dep.extname).to.equal undefined
        #expect(dep.pluginName).to.equal undefined
        expect(dep.pluginName).to.equal ''

      it "calculates bundleRelative", ->
        expect(dep.name relative:'bundle').to.equal 'rootdir/dep'

      it "calculates a normalized fileRelative", ->
        expect(dep.name relative:'file').to.equal '../../../rootdir/dep'

      it "returns depString as toString()", ->
        expect(dep.toString()).to.equal depString

      it "knows dep is found", -> expect(dep.isFound).to.equal true
      it "dep.type is 'bundle'", -> expect(dep.type).to.equal 'bundle'

    describe "converts from bundleRelative to fileRelative:", ->
      dep = new Dependency(
        depString = 'path/from/bundleroot/to/some/nested/module'            # dependency name
        {
          path: 'path/from/bundleroot/module.path'                    # the module that has this dependenecy
          bundle: dstFilenames: ['path/from/bundleroot/to/some/nested/module.js']   # module files in bundle
        }
      )

      it "calculates as-is bundleRelative", ->
        expect(dep.name relative:'bundle').to.equal 'path/from/bundleroot/to/some/nested/module'

      it "calculates a fileRelative", ->
        expect(dep.name relative:'file').to.equal './to/some/nested/module'

      it "knows dep is found", -> tru dep.isFound
      it "dep.type is 'bundle'", -> equal dep.type, 'bundle'

    describe "Changing its depString and module.path:", ->

      describe "changes the calculation of paths:", ->

        dep = new Dependency(
          'path/to/module'           # dependency name
          {
            path: 'someRootModule'
            bundle: dstFilenames: [ # module files in bundle
              'path/to/module.js',
              'path/to/another/module.js']
          }
        )

        dep.depString = 'path/to/another/module'
        dep.module.path = 'some/non/rootModule.js'        # the module that has this dependenecy

        it "knows dep is found", -> tru dep.isFound

        it "dep.type is 'bundle'", ->
          equal dep.type, 'bundle'
          tru dep.isBundle

        it "calculates as-is bundleRelative", ->
          equal dep.name(relative:'bundle'), 'path/to/another/module'

        it "calculates fileRelative", ->
          equal dep.name(relative:'file'), '../../path/to/another/module'

      describe.skip "changes the calculation of paths, with plugin present:", ->

        dep = new Dependency(
          'plugin!path/to/module'         # dependency name
          {
            path: 'someRootModule'        # the module that has this dependenecy
            bundle: dstFilenames: [       # module files in bundle
              'path/to/module.js',
              'path/to/another/module.js']
          }
        )

        dep.depString = 'path/to/another/module'
        dep.module.path = 'some/non/rootModule.js'        # the module that has this dependenecy

        it "knows dep is found", -> expect(dep.isFound).to.equal true
        it "dep.type is 'bundle'", ->
          equal dep.type, 'bundle'
          tru dep.isBundle

        it "calculates as-is bundleRelative with the same plugin", ->
          equal dep.name(relative:'bundle'), 'plugin!path/to/another/module'

        it "calculates fileRelative with the same plugin ", ->
          equal dep.name(relative:'file'), 'plugin!../../path/to/another/module'

  describe "isEquals():", ->
    mod =
      path: 'path/from/bundleroot/module.path.js'
      bundle: dstFilenames: ['rootdir/dep.js']

    anotherMod =
      path: 'another/bundleroot/module2.js'
      bundle: mod.bundle # same bundle

    dep1 = new Dependency '.././../../rootdir/dep.js', mod
    dep2 = new Dependency 'rootdir/dep', mod
    dep3 = new Dependency '../.././rootdir///dep', anotherMod
    depPlugin = new Dependency 'somePlugin!rootdir/dep', mod
    locDep = new Dependency 'localDep', mod

    it "recognises 'local' type equality", ->
      expect(locDep.isEqual 'localDep').to.be.true
      expect(locDep.isEqual './localDep').to.be.false

    it "With `Dependency` as param", ->
      expect(dep1.isEqual dep2).to.be.true
      expect(dep2.isEqual dep1).to.be.true
      expect(dep1.isEqual dep3).to.be.true
      expect(dep3.isEqual dep2).to.be.true

    it "false when plugin differs", ->
      expect(dep1.isEqual depPlugin).to.be.false
      expect(dep2.isEqual depPlugin).to.be.false
      expect(dep3.isEqual depPlugin).to.be.false

    describe "With `String` as param:", ->

      describe " with `bundleRelative` format:", ->

        describe "with .js extensions", ->
          it "matches alike", ->
            expect(dep1.isEqual 'rootdir/dep.js').to.be.true
            expect(dep2.isEqual 'rootdir/dep.js').to.be.true
            expect(dep3.isEqual 'rootdir/dep.js').to.be.true

        describe "plugins still matter:", ->

          it "they make a difference", ->
            expect(dep1.isEqual 'somePlugin!rootdir/dep.js').to.be.false
            expect(dep2.isEqual 'somePlugin!rootdir/dep.js').to.be.false
            expect(dep3.isEqual 'somePlugin!rootdir/dep.js').to.be.false

          it "they only match same plugin name:", ->
            expect(depPlugin.isEqual 'somePlugin!rootdir/dep.js').to.be.true
            expect(depPlugin.isEqual 'someOtherPlugin!rootdir/dep.js').to.be.false

        describe "without extensions:", ->
          it "matches alike", ->
            expect(dep1.isEqual 'rootdir/dep').to.be.true
            expect(dep2.isEqual 'rootdir/dep').to.be.true
            expect(dep3.isEqual 'rootdir/dep').to.be.true

          describe "plugins still matter:", ->
            it "they make a difference", ->
              expect(dep1.isEqual 'somePlugin!rootdir/dep').to.be.false
              expect(dep2.isEqual 'somePlugin!./rootdir/dep').to.be.false
              expect(dep3.isEqual 'somePlugin!rootdir/dep').to.be.false

            it "they only match same plugin name:", ->
              expect(depPlugin.isEqual 'somePlugin!rootdir/dep').to.be.true
              expect(depPlugin.isEqual 'somePlugin!../../../rootdir/dep').to.be.true
              expect(depPlugin.isEqual 'someOtherPlugin!rootdir/dep').to.be.false

      describe " with `fileRelative` format, it matches relative path from same module distance", ->

        it "with .js extensions", ->
          expect(dep1.isEqual '../../../rootdir/dep.js').to.be.true
          expect(dep2.isEqual '../../../rootdir/dep.js').to.be.true

          expect(dep3.isEqual '../../rootdir/dep.js').to.be.true

        it "with .js extensions & unormalized paths", ->
          expect(dep1.isEqual './../../../rootdir/dep.js').to.be.true
          expect(dep2.isEqual '.././../../rootdir/dep.js').to.be.true
          expect(dep3.isEqual './../../rootdir/dep.js').to.be.true

        it "plugins still matter", ->
          expect(depPlugin.isEqual 'somePlugin!../../../rootdir/dep.js').to.be.true
          expect(depPlugin.isEqual 'someOtherPlugin!../../../rootdir/dep.js').to.be.false

        it "plugins still matter with unormalized paths", ->
          expect(depPlugin.isEqual 'somePlugin!./.././../../rootdir/dep.js').to.be.true
          expect(depPlugin.isEqual 'somePlugin!./.././../../rootdir/dep.js').to.be.true

        it "without extensions", ->
          expect(dep1.isEqual './../../../rootdir/dep').to.be.true
          expect(dep2.isEqual './../../../rootdir/dep').to.be.true
          expect(dep3.isEqual '../.././rootdir/./dep').to.be.true

        it "plugins still matter", ->
          expect(depPlugin.isEqual 'somePlugin!./../../../rootdir/dep').to.be.true
          expect(depPlugin.isEqual 'someOtherPlugin!../../../rootdir/dep').to.be.false

      it "with false extensions", ->
        expect(dep1.isEqual 'rootdir/dep.txt').to.be.false
        expect(dep2.isEqual '../../../rootdir/dep.txt').to.be.false
        expect(dep3.isEqual '../../rootdir/dep.txt').to.be.false

      it "looking for one in an array", ->
        dependencies = [dep1, dep2, depPlugin]
        expect(_.any dependencies, (dep)-> dep.isEqual 'rootdir/dep.js').to.be.true

  describe "resolving all types bundle/file relative, external, local, notFound, webRootMap:", ->
    mod =
      path: 'actions/greet'

      bundle:
        dstFilenames: [
          'main.js'
          'actions/greet.js'
          'actions/moreactions/say.js'
          'calc/add.js'
          'calc/multiply.js'
          'data/numbers.js'
          'data/messages/bye.js'
          'data/messages/hello.js'
          'url.js'                          # url is in 'bundle.dependencies.node' bu if in bundle, its a bundle!
        ]
        dependencies:
          node: MasterDefaultsConfig.bundle.dependencies.node.concat [
                  'when/node/function', 'node/**/*', '!stream', '!url']
          locals: { when: [] }

    strDependencies = [
      'underscore'                    # should add to 'local'
      'data/messages/hello.js'        # should remove .js, since its in bundle.dstFilenames
      './/..//data//messages/bye'     # should normalize
      './moreactions/say.js'          # should normalize
      '../lame/dir.js'                # should add to 'notFoundInBundle', add as is
      '.././../some/external/lib.js'  # should add to 'external', add as is
      '/assets/jpuery-max'            # should add to webRootMap
       # system
      'require'
      'module'
      'exports'
      #node / node looking
      'url'     # actually in bundle, we have to declare it on `node`
      'stream'  # normaly node-only, but excluded in dependencies.node from being there!
      'util'    # node only
      'when/node/function' # node only, but also local (not missing)
      'node/nodeOnly/deps'
    ]

    dependencies = []
    for dep in strDependencies
      dependencies.push d = new Dependency dep, mod

    dependencies.push ddd = new Dependency '"main"+".js"', mod, untrusted:true

    expected =
      bundleRelative: untrust [dependencies.length-1], [ # @todo: with .js removed or not ?
        'underscore'                 # local lib
        'data/messages/hello'        # .js is removed since its in bundle.dstFilenames
        'data/messages/bye'          # as bundleRelative
        'actions/moreactions/say'
        'lame/dir' # relative to bundle, event its NOT in bundle.dstFilenames # @todo: .js ?
        '../some/external/lib'    # relative to bundle, considering module.path
        '/assets/jpuery-max'
        'require' # as is
        'module' # as is
        'exports' # as is
        'url'
        'stream'
        'util'
        'when/node/function'
        'node/nodeOnly/deps'
        '"main"+".js"'
      ]
      fileRelative: untrust [dependencies.length-1], [     # @todo: with .js removed or not ?
        'underscore'                    # local lib, as is
        '../data/messages/hello'        # converted fileRelative
        '../data/messages/bye'
        './moreactions/say'
        '../lame/dir' #@todo  .js'
        '../../some/external/lib' #todo .js'    #exactly as is
        '/assets/jpuery-max'
        'require'  # as is
        'module'   # as is
        'exports'  # as is
        '../url'
        'stream'
        'util'
        'when/node/function'
        'node/nodeOnly/deps'
        '"main"+".js"'
      ]
      local: [ 'underscore', 'stream', 'when/node/function' ]
      external:[ '../../some/external/lib'] #.js' ]
      notFoundInBundle:[ '../lame/dir'] #.js' ]

      webRootMap: ['/assets/jpuery-max']
      system: ['require', 'module', 'exports']
      untrusted: untrust [0], ['"main"+".js"']
      node: ['util', 'when/node/function', 'node/nodeOnly/deps']
      nodeLocal: ['when/node/function']


    it "using dep.isXXX:", ->
      fileRelative =  ( d.name relative:'file' for d in dependencies )
      bundleRelative = ( d.name relative:'bundle' for d in dependencies)
      local = ( d.name() for d in dependencies when d.isLocal)
      external = ( d.name() for d in dependencies when d.isExternal)

      notFoundInBundle = ( d.name() for d in dependencies when d.isNotFoundInBundle )
      webRootMap = ( d.name() for d in dependencies when d.isWebRootMap )
      system = ( d.name() for d in dependencies when d.isSystem )
      untrusted = ( d.name() for d in dependencies when d.isUntrusted )
      node = ( d.name() for d in dependencies when d.isNode )
      nodeLocal = ( d.name() for d in dependencies when d.isNodeLocal )

      deepEqual {bundleRelative, fileRelative,
          external, notFoundInBundle, webRootMap,
          system, untrusted, node, nodeLocal, local
      }, expected

    it "using dep.type:", ->
      fileRelative = ( d.name relative:'file' for d in dependencies )
      bundleRelative = ( d.name relative:'bundle' for d in dependencies)
      external = ( d.name() for d in dependencies when d.type is 'external')
      notFoundInBundle = ( d.name() for d in dependencies when d.type is 'notFoundInBundle')
      webRootMap = ( d.name() for d in dependencies when d.type is 'webRootMap' )
      system = ( d.name() for d in dependencies when d.type is 'system' )
      untrusted = ( d.name() for d in dependencies when d.type is 'untrusted' )

      nodeLocal = ( d.name() for d in dependencies when d.type is 'nodeLocal' )

      node = ( d.name() for d in dependencies when d.type in ['node', 'nodeLocal'])
      local = ( d.name() for d in dependencies when d.type in ['local', 'nodeLocal'])

      deepEqual {bundleRelative, fileRelative,
          external, notFoundInBundle, webRootMap,
          system, untrusted, node, nodeLocal, local
      }, expected
