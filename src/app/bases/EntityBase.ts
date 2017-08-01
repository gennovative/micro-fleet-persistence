import { Model } from 'objection';
const mapKeys = require('lodash/mapKeys');
const memoize = require('lodash/memoize');
const snakeCase = memoize(require('lodash/snakeCase'));
const camelCase = memoize(require('lodash/camelCase'));


export abstract class EntityBase extends Model {

	/**
	 * @abstract
	 */
	static get tableName(): string {
		throw 'This method must be implemented by derived class!';
	}

	public id: BigSInt = undefined;

	/**
	 * This is called when an object is serialized to database format.
	 */
	public $formatDatabaseJson(json) {
		json = super.$formatDatabaseJson(json);

		return mapKeys(json, (value, key) => {
			// Maps from "camelCase" to "snake_case" except special keyword.
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