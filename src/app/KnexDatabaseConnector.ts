import * as knex from 'knex';
import { Model, QueryBuilder } from 'objection';

import { injectable, Guard } from 'back-lib-common-util';

import { EntityBase } from './EntityBase';
import { IDatabaseConnector, IConnectionDetail, QueryCallback } from './IDatabaseConnector';

/**
 * Provides settings from package
 */
@injectable()
export class KnexDatabaseConnector implements IDatabaseConnector {
	
	private _connections: any[];
	private _knex; // for unittest mocking

	constructor() {
		this._connections = [];
		this._knex = knex;
	}

	public addConnection(detail: IConnectionDetail, name?: string): void {
		Guard.assertDefined('detail', detail);

		let settings = {
				client: detail.clientName,
				useNullAsDefault: true,
				connection: this.buildConnSettings(detail)
			},
			knexConn = this._knex(settings);
			knexConn['customName'] = name ? name : (this._connections.length + '');
		this._connections.push(knexConn);
	}

	public dispose(): Promise<void> {
		let destroyPromises = this._connections.map(conn => {
			return conn['destroy']();
		});
		this._knex = null;
		this._connections = null;
		return <any>destroyPromises;
	}

	public query<TEntity extends EntityBase>(EntityClass, callback: QueryCallback<TEntity>, ...names: string[]): Promise<any>[] {
		return this._connections.map(conn => {
			let BoundClass;

			// If connection names is specified, we only execute queries on those connections.
			if (names && names.length) {
				if (names.findIndex(name => name == conn['customName']) >= 0) {
					BoundClass = EntityClass['bindKnex'](conn);
					return callback(BoundClass['query'](), BoundClass);
				}
				return null;
			}

			BoundClass = EntityClass['bindKnex'](conn);
			return callback(BoundClass['query'](), BoundClass);
		});
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
		throw 'No database settings!';
	}
}