var msglib = require('../message')

// Provide an initial value for the type given a declaration message
exports.initialize = function(msg) {
  return {}
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
  var k   = msg.args[0]
  var amt = +msg.args[1] || 0
  var data = state.data[msg.path]
  var old = data[k] || 0

  if (msg.op == 'inc') {
    data[k] = old + amt
    return [[k, old], [k, data[k]]]
  }

  if (msg.op == 'dec') {
    data[k] = old - amt
    return [[k, old], [k, data[k]]]
  }

  return new Error('Unknown operation for the CounterSet type')
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
  var msgs = []

  if (!other || typeof other != 'object')
    return

  for (var k in other) {
    var cv = current[k] || 0
    var ov = other[k]

    var diff = (+ov) - (+cv)
    if (diff === 0) {
      // only allow 0 if the current value is undefined
      if (typeof(current[k]) != 'undefined')
        continue
    } else if (!diff)
      continue // dont use a falsey but not-zero value

    var op = 'inc'
    if (diff < 0) {
      op = 'dec'
      diff = -diff
    }
    
    msgs.push(msglib.create(state.id, meta.prev, meta.key, op, k, diff))
  }

  return msgs
}