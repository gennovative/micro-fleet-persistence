import * as knex from 'knex';
import { Model, QueryBuilder, transaction } from 'objection';
const isEmpty = require('lodash/isEmpty');

import { injectable, Guard, MinorException } from 'back-lib-common-util';
import { AtomicSession } from 'back-lib-common-contracts';

import { EntityBase } from '../bases/EntityBase';
import { IDatabaseConnector, IConnectionDetail, QueryCallback, KnexConnection } from './IDatabaseConnector';


/**
 * Provides settings from package
 */
@injectable()
export class KnexDatabaseConnector implements IDatabaseConnector {
	
	private _connections: KnexConnection[];
	private _knex; // for unittest mocking

	constructor() {
		this._connections = [];
		this._knex = knex;
	}

	/**
	 * @see IDatabaseConnector.connections
	 */
	public get connections(): KnexConnection[] {
		return this._connections;
	}

	/**
	 * @see IDatabaseConnector.addConnection
	 */
	public addConnection(detail: IConnectionDetail, name?: string): void {
		Guard.assertArgDefined('detail', detail);

		let settings = {
				client: detail.clientName,
				useNullAsDefault: true,
				connection: this.buildConnSettings(detail)
			},
			knexConn: KnexConnection = this._knex(settings);
			knexConn.customName = name ? name : (this._connections.length + '');
		this._connections.push(knexConn);
	}

	/**
	 * @see IDatabaseConnector.dispose
	 */
	public dispose(): Promise<void> {
		let destroyPromises = this._connections.map(conn => {
			return conn['destroy']();
		});
		this._knex = null;
		this._connections = null;
		return <any>destroyPromises;
	}

	/**
	 * @see IDatabaseConnector.prepare
	 */
	public prepare<TEntity extends EntityBase>(EntityClass, callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[] {
		Guard.assertIsNotEmpty(this._connections, 'Must call addConnection() before executing any query.');
		if (atomicSession) {
			return this.prepareTransactionalQuery(EntityClass, callback, atomicSession);
		}
		return this.prepareSimpleQuery(EntityClass, callback, ...names);
	}


	private buildConnSettings(detail: IConnectionDetail): any {
		// 1st priority: connect to a local file.
		if (detail.fileName) {
			return { filename: detail.fileName };
		}

		// 2nd priority: connect with a connection string.
		if (detail.connectionString) {
			return detail.connectionString;
		}

		// Last priority: connect with host credentials.
		if (detail.host) {
			return {
				host: detail.host.address,
				user: detail.host.user,
				password: detail.host.password,
				database: detail.host.database,
			};
		}
		throw new MinorException('No database settings!');
	}

	private prepareSimpleQuery<TEntity>(EntityClass, callback: QueryCallback<TEntity>, ...names: string[]): Promise<any>[] {
		let calls: Promise<any>[] = [],
			BoundClass;

		for (let knexConn of this._connections) {
			if (isEmpty(names)) {
				BoundClass = EntityClass['bindKnex'](knexConn);
				calls.push(callback(BoundClass['query'](), BoundClass));
			} else {
				// If connection names are specified, we only execute queries on those connections.
				if (names.includes(knexConn.customName)) {
					BoundClass = EntityClass['bindKnex'](knexConn);
					calls.push(callback(BoundClass['query'](), BoundClass));
				}
			}
		}

		return calls;
	}

	private prepareTransactionalQuery<TEntity>(EntityClass, callback: QueryCallback<TEntity>, atomicSession?: AtomicSession): Promise<any>[] {
		let BoundClass = EntityClass['bindKnex'](atomicSession.knexConnection);
		return [
			callback(BoundClass['query'](atomicSession.knexTransaction), BoundClass)
		];
	}

}