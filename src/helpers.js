/**
 * External dependencies
 */
const { defaults } = require('lodash/fp')
const reduce = require('lodash/fp').reduce.convert({ cap: false })
const { v1: uuidv1 } = require('node-uuid')

/**
 * Helper helpers
 */
const transformDefaultValue = value => {
  if (value === 'uuid') { return uuidv1() }
  if (value === 'current-user-uuid') { return uuidv1() } // TODO: get current user from context

  return value
}

/**
 * Module
 */
const helpers = {
  convertId (format) {
    return data =>
      reduce((result, value, key) => {
        if (Array.isArray(value) && value.length && typeof value[0] === 'object') {
          result[key] = reduce((arrayResult, arrayValue, arrayKey) => {
            arrayResult[arrayKey] = helpers.convertId(format)(value)
            return arrayResult
          }, [], value)
        } else if (Object.prototype.toString.call(value) === '[object Object]') {
          result[key] = helpers.convertId(format)(value)
        } else if (format === 'toMongo' && key === 'id') {
          result._id = value
        } else if (format === 'fromMongo' && key === `_id`) {
          result.id = value
        } else {
          result[key] = value
        }

        return result
      }, {}, data)
  },

  setDefaultValues (schema, data, currentUser) {
    const defaultValues = Object.keys(schema).reduce((defaultValues, field) => {
      if (schema[field].defaultValue) {
        defaultValues[field] = transformDefaultValue(schema[field].defaultValue)
      }
      return defaultValues
    }, {})

    const standardDefaults = { // TODO: define in app core
      id: uuidv1(),
      createdBy: currentUser,
      createdAt: new Date(),
      updatedBy: currentUser,
      updatedAt: new Date(),
      active: true
    }

    return defaults(defaultValues, defaults(data, standardDefaults))
  }
}

module.exports = helpers
