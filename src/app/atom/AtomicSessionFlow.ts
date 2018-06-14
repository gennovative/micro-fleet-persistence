import { transaction } from 'objection';
import { MinorException } from '@micro-fleet/common';

import { IDatabaseConnector } from '../connector/IDatabaseConnector';
import { AtomicSession } from './AtomicSession';


export type SessionTask = (session: AtomicSession, previousOutput?: any) => Promise<any>;

/**
 * Provides method to execute queries on many database connections, but still make
 * sure those queries are wrapped in transactions.
 */
export class AtomicSessionFlow {

	private _session: AtomicSession;
	private _tasks: SessionTask[];
	private _initPromise: Promise<any>;
	private _finalPromise: Promise<any>;
	private _abortFn: (reason: any) => void;

	/**
	 * 
	 * @param {string[]} names Only executes the queries on connections with specified names.
	 */
	constructor(protected _dbConnector: IDatabaseConnector) {
		this._tasks = [];
		this._initSession();
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
			this._finalPromise = new Promise(async (resolve, reject) => {
				this._abortFn = reject;
				try {
					let {transProm} = await this._initPromise;
					// Clean up
					this._initPromise = null;

					// Start executing enqueued tasks
					this._loop();

					// Waits for all transaction to complete,
					// but only takes output from primary (first) one.
					// `transPromises` resolves when `resolveAllTransactions` is called,
					// and reject when ``rejectAllTransactions()` is called.
					let outputs = await transProm;
					resolve(outputs);
				}
				// Error on init transaction
				catch (err) { reject(err); }
			});
		}

		return this._finalPromise;
	}

	/**
	 * Adds a task to be executed inside transaction.
	 * This method is chainable and can only be called before `closePipe()` is invoked.
	 */
	public pipe(task: SessionTask): AtomicSessionFlow {
		if (this.isPipeClosed) {
			throw new MinorException('Pipe has been closed!');
		}

		this._tasks.push(task);
		return this;
	}


	private _initSession(): Promise<any[]> {
		const knexConn = this._dbConnector.connection;
		return this._initPromise = new Promise(resolve => {
				const transProm = transaction(knexConn, trans => {
					this._session = new AtomicSession(knexConn, trans);
					// Avoid passing a promise to resolve(),
					// as it will wait forever
					resolve({ transProm });
					return null;
				});
		});
	}

	private _doTask(prevOutput: any): Promise<any[]> {
		let task = this._tasks.shift();
		prevOutput = prevOutput || [];

		if (!task) {
			// When there's no more task, we commit all transactions.
			this._resolveTransactions(prevOutput);
			return null;
		}

		// return this.collectTasksOutputs(task, prevOutputs);
		return task(this._session, prevOutput);
	}

	/*
	private collectTasksOutputs(task, prevOutputs): Promise<any> {
		// Unlike Promise.all(), this promise collects all query errors.
		return new Promise((resolve, reject) => {
			let i = 0,
				session = this._session,
				results = [],
				errors = [];

			// Execute each task on all sessions (transactions).
			// for (let s of sessions) {
				task.call(null, this._session, prevOutputs[i])
					.then(r => {
						// Collect results
						results.push(r);
						if (++i == sLen) {
							// If there is at least one error,
							// all transactions are marked as failure.
							if (errors.length) {
								reject(errors.length == 1 ? errors[0] : errors);
							} else {
								// All transactions are marked as success
								// only when all of them finish without error.
								resolve(results);
							}
						}
					})
					.catch(er => {
						errors.push(er);
						// Collect error from all queries.
						if (++i == sLen) {
							reject(errors.length == 1 ? errors[0] : errors);
						}
					});
		});
	}
	//*/

	private async _loop(prevOutput?: any): Promise<void> {
		let prevWorks = this._doTask(prevOutput);
		if (!prevWorks) {
			return;
		}

		prevWorks
			.then(prev => {
				return this._loop(prev);
			})
			.catch(err => this._rejectTransactions(err))
			// This catches both promise errors and AtomicSessionFlow's errors.
			.catch(this._abortFn);
	}

	private _resolveTransactions(output: any): void {
		this._session.knexTransaction.commit(output);
		this._session = this._tasks = null; // Clean up
	}
	
	private _rejectTransactions(error: any): void {
		this._session.knexTransaction.rollback(error);
		this._session = this._tasks = null; // Clean up
	}
}