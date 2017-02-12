/**
 * External dependencies
 */
const { assign } = require('lodash/fp')
const { MongoClient } = require('mongodb')
const winston = require('winston')
const Promise = require('bluebird')

/**
 * Internal dependencies
 */
const { convertId, setDefaultValues } = require('./src/helpers')
const { NotFoundError } = require('./src/errors')

let domains
let dbConnection

const defaultSort = '_id'
const defaultLimit = 20
const defaultPage = 1

/**
 * Helpers
 */
const getCount = (model, queryInput) =>
  new Promise((resolve, reject) => {
    dbConnection.collection(model)
      .count(convertId('toMongo')(queryInput), (e, count) => {
        if (e) { return reject(e) }

        resolve(count)
      })
  })

const getModels = (model, query = {}, { page, limit, sort }) => {
  const numberLimit = +limit || defaultLimit
  const pageNumber = +page || defaultPage
  const stringSort = typeof sort === 'string' ? sort : defaultSort

  return new Promise((resolve, reject) => {
    dbConnection.collection(model)
      .find(convertId('toMongo')(query))
      .sort({ [stringSort]: 1 })
      .skip((pageNumber - 1) * numberLimit)
      .limit(numberLimit)
      .toArray((e, data) => {
        if (e) { return reject(e) }

        resolve(data.map(convertId('fromMongo')))
      })
  })
}

const throwIfNotModified = res => {
  if (res.modifiedCount !== 1) { throw new NotFoundError() }
}

const mongo = {
  getDb () {
    return dbConnection
  },

  /**
   * Initializes the DB connection and models.
   *
   * @return void
   */
  init ({ domains: domainsInput, options }) {
    domains = domainsInput

    return new Promise((resolve, reject) => {
      MongoClient.connect(options.dbUrl, (e, db) => {
        if (e) {
          winston.error(`Cannot connect to ${options.dbUrl}: ${e.message}`)
          return reject(e)
        }

        dbConnection = db
        winston.info(`Connected to ${options.dbUrl}`)
        resolve()
      })
    })
  },

  /**
   * Gets a record by search criteria
   *
   * @param  String model The model to use
   * @param  Object find  The query to run
   * @return Object
   */
  getModel (model, find) {
    return new Promise((resolve, reject) => {
      dbConnection.collection(model).findOne(convertId('toMongo')(assign(find, { active: true })), (e, data) => {
        if (e) { return reject(e) }
        if (!data) { return reject(new NotFoundError()) }

        resolve(data)
      })
    })
      .then(convertId('fromMongo'))
  },

  /**
   * Gets multiple records and adds the ability to paginate.
   *
   * @param  String model The model to use
   * @param  Object find  The query to run
   * @param  Object options - page:number | limit:number | sort:string
   * @return Array
   */
  getModels (model, find, { page, limit, sort }) {
    return new Promise((resolve, reject) =>
      Promise.join(
        getCount(model, assign(find, { active: true })),
        getModels(model, assign(find, { active: true }), { page, limit, sort }),
        (total, records) => resolve({ total, records })
      )
        .catch(reject)
    )
  },

  /**
   * Creates a model.
   *
   * @param  String model The name of the model
   * @param  Object data  The data to set
   * @param  Object currentUser The current logged in user
   * @return Object
   */
  create (model, data, currentUser) {
    let defaultData
    return new Promise((resolve, reject) => {
      defaultData = convertId('toMongo')(setDefaultValues(domains[model].getSchema(), data, currentUser))

      return dbConnection.collection(model).insert(defaultData, (e, data) => {
        if (e) { return reject(e) }

        resolve(data)
      })
    })
      .then(({ insertedIds }) => mongo.getModel(model, { id: defaultData._id }))
  },

  /**
   * Edits a model by a custom criteria.
   *
   * @param  String model The name of the model
   * @param  Object query The query to use
   * @param  Object data  The data to set
   * @return Object
   */
  edit (model, queryInput, data) {
    const query = typeof queryInput === 'string' ? { _id: queryInput } : queryInput
    const id = query._id
    const dataWithUpdatedAt = assign(data, { updatedAt: new Date() })

    return dbConnection.collection(model).updateOne(query, { $set: dataWithUpdatedAt })
      .then(throwIfNotModified)
      .then(() => mongo.getModel(model, { id }))
  },

  /**
   * Removes a model by a custom criteria.
   *
   * @param  String model The name of the model
   * @param  Object query The query to use
   * @param  Object data  The data to set
   * @return Object
   */
  remove (model, queryInput) {
    const query = typeof queryInput === 'string' ? { _id: queryInput } : queryInput

    return dbConnection.collection(model).updateOne(query, { $set: { active: false } })
      .then(throwIfNotModified)
  }
}

module.exports = mongo
