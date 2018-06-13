import { Model } from 'objection';
import mapKeys from 'lodash/mapKeys';

import { ModelAutoMapper } from '@micro-fleet/common';

const snakeCase = global['snakeCase'];
const camelCase = global['camelCase'];


export abstract class EntityBase extends Model {

	/**
	 * @abstract
	 */
	public static get tableName(): string {
		throw 'This method must be implemented by derived class!';
	}

	/**
	 * @abstract
	 */
	public static get translator(): ModelAutoMapper<EntityBase> {
		throw 'This method must be implemented by derived class!';
	}

	/**
	 * [ObjectionJS] Array of primary column names.
	 */
	public static readonly idColumn: string[] = ['id'];

	/**
	 * An array of non-primary unique column names.
	 */
	public static readonly uniqColumn: string[] = [];

	/**
	 * Same with `idColumn`, but transform snakeCase to camelCase.
	 * Should be overriden (['id', 'tenantId']) for composite PK.
	 */
	public static readonly idProp = EntityBase.idColumn.map<string>(camelCase);


	// public id: BigInt = undefined;

	/**
	 * This is called when an object is serialized to database format.
	 */
	public $formatDatabaseJson(json: any) {
		json = super.$formatDatabaseJson(json);

		return mapKeys(json, (value: any, key: string) => {
			// Maps from "camelCase" to "snake_case" except special keyword.
			/* istanbul ignore if */
			if (key.indexOf('#') == 0) {
				return key;
			}
			return snakeCase(<any>key);
		});
	}

	/**
	 * This is called when an object is read from database.
	 */
	public $parseDatabaseJson(json: any) {
		json = mapKeys(json, (value: any, key: string) => {
			// Maps from "snake_case" to "camelCase"
			return camelCase(<any>key);
		});

		return super.$parseDatabaseJson(json);
	}
}

EntityBase.knex(null);