var msglib = require('../message')
var util   = require('../util')
var vclib  = require('../vclock')

// Provide an initial value for the type given a declaration message
exports.initialize = function(msg) {
  return null
}

// Apply an update message to the current value
// - `state`: the internal state of the parent object
//   - `state.id`: object id
//   - `state.vclock`: local time
//   - `state.nodei`: index of the local node in the member set
//   - `state.members`: member set of the object
//   - `state.data`: current values
//   - `state.meta`: metadata about object's types
// - `msg`: the message applying the update
//   - `msg.path`: key of the value to update
//   - `msg.op`: operation to run
//   - `msg.args`: arguments to the operation
//   - `msg.obj`: link to the object's declaration message
//   - `msg.vts`: vector timestamp of the message
// - `authi`: index of the message author in the member set
exports.apply = function(state, msg, authi) {
  var v    = msg.args[0]
  var meta = state.meta[msg.path]
  meta.seq = meta.seq || -1

  if (meta.seq > msg.seq || (meta.seq === msg.seq && meta.authi < authi)) {
    // existing definition's timestamp dominates, abort
    return
  }

  var old  = util.deepclone(state.data[msg.path] || null)
  if (msg.op == 'set') {
    state.data[msg.path] = v
    meta.seq = msg.seq
    meta.authi = authi // track authi
    return [old, v]
  }

  return new Error('Unknown operation for the Register type')
}

// Compare two values and produce update operations to reconcile them
// - `state`: the internal state of the parent object
//   - `state.id`: object id
//   - `state.vclock`: local time
//   - `state.nodei`: index of the local node in the member set
//   - `state.members`: member set of the object
//   - `state.data`: current values
//   - `state.meta`: metadata about object's types
// - `meta`: the metadata of the value to update
//   - `meta.key`: the name of the value
//   - `meta.author`: the member who declared the value
//   - `meta.authi`: the index of the author in the member set
//   - `meta.vts`: the latest timestamp of the value
exports.diff = function(state, meta, current, other) {
  if (current === other)
    return
  if (other && typeof other == 'object')
    throw new Error('Registers can only be set to values, not objects')
  return [msglib.create(state.id, meta.prev, meta.key, 'set', other)]
}