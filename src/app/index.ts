/* istanbul ignore next */
if (!Reflect || typeof Reflect['hasOwnMetadata'] !== 'function') {
    require('reflect-metadata')
}

import memoize = require('lodash/memoize')
global['snakeCase'] = memoize(require('lodash/snakeCase'))
global['camelCase'] = memoize(require('lodash/camelCase'))

export * from './atom/AtomicSessionFactory'
export * from './atom/AtomicSessionFlow'
export * from './atom/AtomicSession'
export * from './bases/BatchProcessor'
export * from './bases/EntityBase'
export * from './bases/IQueryBuilder'
export * from './bases/MonoProcessor'
export * from './bases/MonoQueryBuilder'
export * from './bases/RepositoryBase'
export * from './bases/SoftDelRepositoryBase'
export * from './bases/TenantQueryBuilder'
export * from './bases/VersionControlledProcessor'
export * from './connector/IDatabaseConnector'
export * from './connector/KnexDatabaseConnector'
export * from './DatabaseAddOn'
export * from './interfaces'
export * from './register-addon'
export * from './Types'
