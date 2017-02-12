/**
 * External dependencies
 */
const winston = require('winston')

class ExtendableError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.message = message
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(message)).stack
    }
  }
}

class BadRequestError extends ExtendableError {
  constructor (message) {
    super(message)
    this.message = message || 'bad request'
  }
}

class NotFoundError extends ExtendableError {
  constructor (message) {
    super(message)
    this.message = message || 'not found'
  }
}

class UnauthorizedError extends ExtendableError {
  constructor (message) {
    super(message)
    this.message = message || 'unauthorized'
  }
}

module.exports = {
  uncaughtExceptionHandler: function uncaughtExceptionHandler (err) {
    winston.error(`Uncaught exception: ${(err && err.stack) || err}`)
    process.exit(1)
  },

  onPossiblyUnhandledRejection: function onPossiblyUnhandledRejection (err) {
    winston.error(`Possibly unhandled bluebird exception: ${(err && err.stack) || err}`)
  },

  serverExceptionHandler: function serverExceptionHandler (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      winston.error(`Unauthorized to access ${req.method} ${req.path}`)
      return res.status(403).send()
    }

    winston.error(`server uncaught exception: ${(err && err.stack) || err}`)
    res.status(500).end()
  },

  BadRequestError,
  NotFoundError,
  UnauthorizedError
}
