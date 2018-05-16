import { transaction } from 'objection';
import { MinorException } from 'back-lib-common-util';
import { AtomicSession } from 'back-lib-common-contracts';

import { IDatabaseConnector, KnexConnection } from '../connector/IDatabaseConnector';


export type SessionTask = (session: AtomicSession, previousOutput?: any) => Promise<any>;

/**
 * Provides method to execute queries on many database connections, but still make
 * sure those queries are wrapped in transactions.
 */
export class AtomicSessionFlow {

	private _sessions: AtomicSession[];
	private _tasks: SessionTask[];
	private _initPromise: Promise<any[]>;
	private _finalPromise: Promise<any>;
	private _abortFn: (reason) => void;

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
			this._finalPromise = new Promise(async (resolve, reject) => {
				this._abortFn = reject;
				try {
					let transPromises = await this._initPromise;
					// Clean up
					this._initPromise = null;

					// Start executing enqueued tasks
					this.loop();

					// Waits for all transaction to complete,
					// but only takes output from primary (first) one.
					// `transPromises` resolves when `resolveAllTransactions` is called,
					// and reject when ``rejectAllTransactions()` is called.
					let outputs = await Promise.all(transPromises);
					resolve(outputs[0]);
				}
				// Error on init transaction
				catch (err) { reject(err); }
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
		return this._initPromise = new Promise<any[]>((resolveInit, rejectInit) => {
			let transPromises = [],
				conns: KnexConnection[] = this._dbConnector.connections,
				len = conns.length,
				i = 0;

			// Start a new transaction for each connection.
			for (let knexConn of conns) {
				if (names && names.length && !names.includes(knexConn.customName)) {
					continue;
				}

				// `transPro` resolves when transaction is commited. Otherwise, it rejects.
				let transPro: Promise<any> = transaction(knexConn, trans => {
					this._sessions.push(new AtomicSession(knexConn, trans));

					i++;
					// Last connection
					if (i == len || (names && names.length && i == names.length)) {
						resolveInit(transPromises);
					}

					return null;
				});
				transPromises.push(transPro);
			} // END for
			if (!transPromises.length) {
				rejectInit(new MinorException('No transaction was created!'));
			}
		});
	}

	private doTask(prevOutputs: any[]): Promise<any[]> {
		let task = this._tasks.shift();
		prevOutputs = prevOutputs || [];

		if (!task) {
			// When there's no more task, we commit all transactions.
			this.resolveAllTransactions(prevOutputs);
			return null;
		}

		return this.collectTasksOutputs(task, prevOutputs);
	}

	private collectTasksOutputs(task, prevOutputs): Promise<any> {
		// Unlike Promise.all(), this promise collects all query errors.
		return new Promise((resolve, reject) => {
			let i = 0,
				sessions = this._sessions,
				sLen = sessions.length,
				results = [],
				errors = [];

			// Execute each task on all sessions (transactions).
			for (let s of sessions) {
				task.call(null, s, prevOutputs[i])
					.then(r => {
						// Collect results
						results.push(r);
						if (++i == sLen) {
							// If there is at least one error,
							// all transactions are marked as failure.
							if (errors.length) {
								/* istanbul ignore next */
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
							/* istanbul ignore next */
							reject(errors.length == 1 ? errors[0] : errors);
						}
					});
			} // END for
		});
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
			.catch(err => this.rejectAllTransactions(err))
			// This catches both promise errors and AtomicSessionFlow's errors.
			.catch(this._abortFn);
	}

	private resolveAllTransactions(outputs): void {
		this._sessions.forEach((s, i) => s.knexTransaction.commit(outputs[i]));
		this._sessions = this._tasks = null; // Clean up
	}

	private rejectAllTransactions(error): void {
		this._sessions.forEach(s => s.knexTransaction.rollback(error));
	}
}