/* istanbul ignore next */
if (!Reflect || typeof Reflect['hasOwnMetadata'] !== 'function') {
    require('reflect-metadata')
}

import memoize = require('lodash.memoize')
global['camelCase'] = memoize(require('lodash.camelcase'))

export * from './atom/AtomicSessionFactory'
export * from './atom/AtomicSessionFlow'
export * from './atom/AtomicSession'
export * from './bases/GeneralCrudRepositoryBase'
export * from './bases/ORMModelBase'
export * from './bases/PgCrudRepositoryBase'
export * from './connector/IDatabaseConnector'
export * from './connector/KnexDatabaseConnector'
export * from './DatabaseAddOn'
export * from './DatabaseSettings'
export * from './DatabaseAddOn'
export * from './interfaces'
export * from './register-addon'
export * from './Types'
