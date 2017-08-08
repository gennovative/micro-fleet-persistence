/* istanbul ignore else */
if (!Reflect || typeof Reflect['hasOwnMetadata'] !== 'function') {
	require('reflect-metadata');
}
import './convert-utc';
export * from './EntityBase';
export * from './RepositoryBase';
export * from './IDatabaseConnector';
export * from './KnexDatabaseConnector';
export * from './Types';