_ = (_B = require 'uberscore')._
toAST = require './toAST'

module.exports = isEqualCode = (code1, code2)->
  _.isEqual toAST(code1, 'Program'),
            toAST(code2, 'Program')


