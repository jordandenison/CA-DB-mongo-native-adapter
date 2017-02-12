/**
 * External dependencies
 */
const test = require('ava')

/**
 * SUT
 */
const helpers = require('./helpers')

const arbitraryModelThatExists = 'comment'

test('convertId: converts to mongoId without mutation', t => {
  const data = { id: 'test' }
  const result = helpers.convertId('toMongo')(data)

  t.is(data.id, 'test')
  t.is(Object.keys(data).length, 1)
  t.is(result._id, 'test')
  t.is(Object.keys(result).length, 1)
})

test('convertId: converts from mongoId without mutation', t => {
  const data = { _id: 'test' }
  const result = helpers.convertId('fromMongo')(data)

  t.is(data._id, 'test')
  t.is(Object.keys(data).length, 1)
  t.is(result.id, 'test')
  t.is(Object.keys(result).length, 1)
})

test('convertId: converts nested ids', t => {
  const data = { test: { _id: 'test', test: 'test' } }
  const result = helpers.convertId('fromMongo')(data)

  t.is(result.test.id, 'test')
  t.is(Object.keys(result.test).length, 2)
})

test('convertId: converts ids in objects in an array', t => {
  const data = [ { test: { _id: 'test', test: 'test' } } ]
  const result = helpers.convertId('fromMongo')(data)

  t.is(result[0].test.id, 'test')
  t.is(Object.keys(result[0].test).length, 2)
})

test('setDefaultValues: sets id, createdAt, updatedAt, createdBy, updatedBy and active if not present', t => {
  const currentUser = 'testUserUUID'
  const result = helpers.setDefaultValues(arbitraryModelThatExists, {}, currentUser)

  t.truthy(result.id)
  t.truthy(result.createdAt)
  t.is(result.createdBy, currentUser)
  t.truthy(result.updatedAt)
  t.is(result.updatedBy, currentUser)
  t.true(result.active)
})

test('setDefaultValues: retains original input data and does not mutate', t => {
  const data = { someField: 'test' }
  const result = helpers.setDefaultValues(arbitraryModelThatExists, data)

  t.is(data.someField, 'test')
  t.is(Object.keys(data).length, 1)
  t.is(result.someField, 'test')
  t.true(Object.keys(result).length > 4)
})

test('setDefaultValues: retains original input data and does not mutate', t => {
  const data = { someField: 'test' }
  const result = helpers.setDefaultValues(arbitraryModelThatExists, data)

  t.is(data.someField, 'test')
  t.is(Object.keys(data).length, 1)
  t.is(result.someField, 'test')
  t.true(Object.keys(result).length > 4)
})
