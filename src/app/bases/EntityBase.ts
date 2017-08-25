import { Model } from 'objection';
const mapKeys = require('lodash/mapKeys');
const memoize = require('lodash/memoize');
const snakeCase = memoize(require('lodash/snakeCase'));
const camelCase = memoize(require('lodash/camelCase'));


export abstract class EntityBase extends Model {

	/**
	 * @abstract
	 */
	public static get tableName(): string {
		throw 'This method must be implemented by derived class!';
	}

	/**
	 * Should be overiden (['id', 'tenant_id']) for composite PK.
	 */
	public static readonly idColumn = ['id'];
	
	/**
	 * Same with `idColumn`, but transform snakeCase to camelCase.
	 * Should be overiden (['id', 'tenantId']) for composite PK.
	 */
	public static readonly idProp = ['id'];


	public id: BigSInt = undefined;

	/**
	 * This is called when an object is serialized to database format.
	 */
	public $formatDatabaseJson(json) {
		json = super.$formatDatabaseJson(json);

		return mapKeys(json, (value, key) => {
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
	public $parseDatabaseJson(json) {
		json = mapKeys(json, (value, key) => {
			// Maps from "snake_case" to "camelCase"
			return camelCase(<any>key);
		});

		return super.$parseDatabaseJson(json);
	}
}

EntityBase.knex(null);