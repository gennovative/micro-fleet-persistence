import { transaction } from 'objection';
import { MinorException } from 'back-lib-common-util';
import { AtomicSession } from 'back-lib-common-contracts';

import { IDatabaseConnector, KnexConnection } from '../connector/IDatabaseConnector';


export type SessionTask = (session: AtomicSession, previousOutputs?: any[]) => Promise<any>;

/**
 * Provides method to execute queries on many database connections, but still make
 * sure those queries are wrapped in transactions.
 */
export class AtomicSessionFlow {

	private _sessions: AtomicSession[];
	private _tasks: SessionTask[];
	private _initPromise: Promise<any[]>;
	private _finalPromise: Promise<any>;

	/**
	 * 
	 * @param {string[]} names Only executes the queries on connections with specified names.
	 */
	constructor(protected _dbConnector: IDatabaseConnector, names: string[]) {
		this._sessions = [];
		this._tasks = [];
		this.initSessions(names);
	}

	/**
	 * Checks if it is possible to call "pipe()".
	 */
	public get isPipeClosed(): boolean {
		return (this._finalPromise != null);
	}


	/**
	 * Returns a promise which resolves to the output of the last query
	 * on primary (first) connection.
	 * This method must be called at the end of the pipe chain.
	 */
	public closePipe(): Promise<any> {
		if (!this.isPipeClosed) {
			this._finalPromise = this._initPromise
				.then(transPromises => {
					// Clean up
					this._initPromise = null;

					let finalPromise = Promise.all(transPromises)
						.then(outputs => outputs[0]);

					// Wrap in an array to pass to next "then",
					// as we don't want to wait for it now.
					return [finalPromise];
				})
				.then(([finalPromise]) => {
					this.loop();
					return finalPromise;
				});
		}

		return this._finalPromise;
	}

	/**
	 * Adds a task to session, it will be executed inside transaction of each connections
	 * This method is chainable and can only be called before `closePipe()` is invoked.
	 */
	public pipe(task: SessionTask): AtomicSessionFlow {
		if (this.isPipeClosed) {
			throw new MinorException('Pipe has been closed!');
		}

		this._tasks.push(task);
		return this;
	}


	private initSessions(names: string[]): Promise<any[]> {
		return this._initPromise = new Promise<any[]>(resolveInit => {
			let transPromises = [],
				conns: KnexConnection[] = this._dbConnector.connections,
				len = conns.length,
				i = 0;

			// For each connection, we start a new transaction.
			conns.forEach(knexConn => {
				if (names && names.length && !names.includes(knexConn.customName)) {
					return;
				}

				transaction(knexConn, trans => {
					let promise = this.wrapTransaction(knexConn, trans);
					transPromises.push(promise);

					i++;
					// Last connection
					if (i == len) {
						resolveInit(transPromises);
					}

					// Transaction is commited if this promise resolves.
					// Otherwise, it is rolled back.
					// This is how ObjectionJS transaction works.
					return promise;
				});
			});
		});
	}

	private wrapTransaction(knexConn, knexTrans): Promise<any> {
		return new Promise((resolve, reject) => {
				this._sessions.push(new AtomicSession(knexConn, knexTrans, resolve, reject));
			})
			.catch(err => this.rejectAllTransactions(err));
	}

	private loop(prevOutputs?: any[]): Promise<void> {
		let prevWorks = this.doTask(prevOutputs);
		if (!prevWorks) {
			return;
		}

		prevWorks
			.then(prev => {
				this.loop(prev);
			})
			.catch(err => this.rejectAllTransactions(err));
	}

	private doTask(prevOutputs: any[]): Promise<any[]> {
		let task = this._tasks.shift();
		prevOutputs = prevOutputs || [];
		
		if (!task) {
			// When there's no more task, we commit all transactions.
			this._sessions.forEach((s, i) => s.resolve(prevOutputs[i]));
			this._sessions = this._tasks = null; // Clean up
			return null;
		}

		// Execute each task on all connections (transactions).
		return Promise.all(
			this._sessions.map((s, i) => task(s, prevOutputs[i]))
		);
	}

	private rejectAllTransactions(error) {
		this._sessions.forEach(s => s.reject(error));
		return Promise.reject(error);
	}
}