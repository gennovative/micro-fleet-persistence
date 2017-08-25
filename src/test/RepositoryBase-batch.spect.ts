import { expect } from 'chai';

import { DbClient } from 'back-lib-common-constants';
import { InvalidArgumentException, MinorException, BigIdGenerator } from 'back-lib-common-util';
import { PagedArray, ModelAutoMapper, AtomicSession, IHardDelRepository } from 'back-lib-common-contracts';

import { RepositoryBase, EntityBase, QueryCallback, IDatabaseConnector,
		KnexDatabaseConnector, AtomicSessionFactory, AtomicSessionFlow } from '../app';
import DB_DETAILS from './database-details';


const CONN_FILE = `${process.cwd()}/database-adapter-test.sqlite`,
	CONN_FILE_2 = `${process.cwd()}/database-adapter-test-second.sqlite`,
	// For SQLite3 file
	// DB_TABLE = 'userdata',

	// For PostgreSQL
	DB_TABLE = 'userdata',

	IMPOSSIBLE_IDs = ['0', '-1'];


// Should put this in Types.ts
const TYPE_USER_DTO = Symbol('UserDTO'),
	TYPE_USER_ENT = Symbol('UserEntity');

class UserDTO implements IModelDTO {

	public static translator: ModelAutoMapper<UserDTO> = new ModelAutoMapper(UserDTO);

	// NOTE: Class properties must be initialized, otherwise they
	// will disappear in transpiled code.
	public id: BigSInt = undefined;
	public name: string = undefined;
	public age: number = undefined;
	public deletedAt: number = undefined;
}


class UserEntity extends EntityBase {
	/**
	 * @override
	 */
	public static get tableName(): string {
		return DB_TABLE;
	}

	public static readonly idColumn = ['id'];

	public static translator: ModelAutoMapper<UserEntity> = new ModelAutoMapper(UserEntity);

	// NOTE: Class properties must be initialized, otherwise they
	// will disappear in transpiled code.
	public name: string = undefined;
	public age: number = undefined;
	public deletedAt: number = undefined;
}

class UserRepo 
	extends RepositoryBase<UserEntity, UserDTO>
	implements IHardDelRepository<UserDTO> {
	
	private _sessionFactory: AtomicSessionFactory;

	constructor(
		dbConnector: IDatabaseConnector
	) {
		super(dbConnector);
		this._sessionFactory = new AtomicSessionFactory(dbConnector);
	}

	protected get idCol(): string[] {
		return UserEntity.idColumn;
	}

	protected get idProp(): string[] {
		return UserEntity.idProp;
	}


	public createTwoCouplesWithTransaction(adams: UserDTO[], evas: UserDTO[]): Promise<UserDTO[]> {
		return this._sessionFactory.startSession()
			.pipe(atomicSession => {
				console.log('Conn: ', atomicSession.knexConnection.customName);
				return this.create(adams, { atomicSession });
			})
			.pipe((atomicSession, createdAdams) => {
				if (!createdAdams) {
					debugger;
					// In fact, this scenario should never happen.
					// Because when we come to this point, the previous task must have been successfull.
					return Promise.reject('Cannot live without our husbands!');
				}
				return this.create(evas, { atomicSession })
					.then(createdEvas => [...createdAdams, ...createdEvas]);
			})
			.closePipe();
	}

	private _counter = 0;
	public firstOutput: UserDTO[];
	public failOnSecondTransaction(adams: UserDTO[], evas: UserDTO[]): Promise<UserDTO[]> {
		return this._sessionFactory.startSession()
			.pipe(atomicSession => this.create(adams, { atomicSession }))
			.pipe((atomicSession, createdAdams) => {
				this._counter++;
				// If this is transaction of the second connection
				if (this._counter == 2) {
					return new Promise((resolve, reject) => {
						// Delay here to let first transaction to finish,
						// but throw MinorException before it resolves.
						setTimeout(() => {
							reject(new MinorException('Error on second transaction'));
						}, 100);
				});
				} else {
					return new Promise((resolve, reject) => {
						this.create(evas, { atomicSession })
							.then(createdEvas => {
								this.firstOutput = [...createdAdams, ...createdEvas];
								// First transaction has finished but not yet resolves,
								// it must delay here to let second transaction to fail
								setTimeout(() => {
									resolve(this.firstOutput);
								}, 200);
							});
					});
				}
			})
			.closePipe();
	}

	public createAdamsOnSecondConn(adams: UserDTO[]): Promise<UserDTO[]> {
		return this._sessionFactory.startSession('sec')
			.pipe(atomicSession => this.create(adams, { atomicSession }))
			.closePipe();
	}

	public createSessionPipe(adams: UserDTO[], evas: UserDTO[]): AtomicSessionFlow {
		return this._sessionFactory.startSession()
			.pipe(atomicSession => this.create(adams, { atomicSession }))
			.pipe((atomicSession, createdAdams) => {
				if (!createdAdams) {
					debugger;
					// In fact, this scenario should never happen.
					// Because when we come to this point, the previous task must have been successfull.
					return Promise.reject('Cannot live without my husband!');
				}
				return this.create(evas, { atomicSession })
					.then(createdEvas => [...createdAdams, ...createdEvas]);
			});
			//.closePipe(); // Not closing pipe
	}

	public createEmptyPipe(adams: UserDTO[], eva: UserDTO[]): AtomicSessionFlow {
		return this._sessionFactory.startSession()
			.pipe(session => {
				return Promise.resolve('Nothing');
			});
			//.closePipe(); // Not closing pipe
	}

	public async findOnFirstConn(id: BigSInt): Promise<UserDTO> {
		let foundEnt: UserEntity = await this.executeQuery(query => {
				return query.findById(id);
			}, null, '0'); // Executing on first connection only.

		return this.toDTO(foundEnt, false);
	}

	public async findOnSecondConn(id: BigSInt): Promise<UserDTO> {
		let foundEnt: UserEntity = await this.executeQuery(query => {
				return query.findById(id);
			}, null, 'sec'); // Executing on second connection (named 'sec').

		return this.toDTO(foundEnt, false);
	}

	public async deleteOnSecondConn(ids: BigSInt[]): Promise<number> {
		let affectedRowArr = await Promise.all(ids.map(id => 
			this.executeCommand(query => {
					return query.deleteById(id);
				}, null, 'sec')
		));
		return affectedRowArr[0];
	}

	public deleteAll(): Promise<void> {
		return this.executeCommand(query => query.delete());
	}

	/**
	 * @override
	 */
	protected prepare<UserEntity>(callback: QueryCallback<UserEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[] {
		return this._dbConnector.prepare(UserEntity, <any>callback, atomicSession, ...names);
	}

	/**
	 * @override
	 */
	protected toEntity(from: UserDTO | UserDTO[], isPartial: boolean): UserEntity & UserEntity[] {
		if (isPartial) {
			return <any>UserEntity.translator.partial(from);
		}
		return <any>UserEntity.translator.whole(from);
	}

	/**
	 * @override
	 */
	protected toDTO(from: UserEntity | UserEntity[], isPartial: boolean): UserDTO & UserDTO[] {
		if (isPartial) {
			return <any>UserDTO.translator.partial(from, { enableValidation: false });
		}
		// Disable validation because it's unnecessary.
		return <any>UserDTO.translator.whole(from, { enableValidation: false });
	}
}

let cachedDTOs: UserDTO[],
	dbConnector: IDatabaseConnector,
	usrRepo: UserRepo,
	idGen = new BigIdGenerator();

// These test suites make real changes to SqlLite file or PostgreSQl server.
describe('RepositoryBase-batch', function() {
	this.timeout(10000);

	beforeEach('Initialize db adapter', () => {
		dbConnector = new KnexDatabaseConnector();
		// // For SQLite3 file
		// dbConnector.addConnection({
			// clientName: DbClient.SQLITE3,
			// fileName: CONN_FILE,
		// });

		// // For PostgreSQL
		dbConnector.addConnection(DB_DETAILS);
		usrRepo = new UserRepo(dbConnector);
	});

	afterEach('Tear down db adapter', async () => {
		await dbConnector.dispose();
		dbConnector = null;
	});

	describe('create with transaction', () => {

		beforeEach(() => {
			// Add second connection
			let secondDb = Object.assign({}, DB_DETAILS);
			secondDb.host = Object.assign({}, DB_DETAILS.host);
			secondDb.host.database = 'unittestTwo';
			dbConnector.addConnection(secondDb, 'sec'); // Name this connection as 'sec'
		});

		it('should insert four rows on each database', async () => {
			// Arrange
			let adamOne = new UserDTO(),
				adamTwo = new UserDTO(),
				evaOne = new UserDTO(),
				evaTwo = new UserDTO();

			adamOne.id = idGen.next().toString();
			adamOne.name = 'Adam One';
			adamOne.age = 11;

			adamTwo.id = idGen.next().toString();
			adamTwo.name = 'Adam Two';
			adamTwo.age = 22;

			evaOne.id = idGen.next().toString();
			evaOne.name = 'Eva One';
			evaOne.age = 33;

			evaTwo.id = idGen.next().toString();
			evaTwo.name = 'Eva Two';
			evaTwo.age = 44;

			let sources = [adamOne, adamTwo, evaOne, evaTwo];

			try {
				// Act
				let output = await usrRepo.createTwoCouplesWithTransaction([adamOne, adamTwo], [evaOne, evaTwo]);
				expect(output).to.exist;
				expect(output.length).to.equal(4);

				output.forEach((u, i) => {
					expect(u.id).to.equal(sources[i].id);
					expect(u.name).to.equal(sources[i].name);
					expect(u.age).to.equal(sources[i].age);
				});

				// Clean up
				await usrRepo.deleteHard(output.map(u => u.id));
			} catch (err) {
				console.error(err);
				expect(err).not.to.exist;
			}
		});

		it('should rollback all transactions when a query fails either on one or all transactions', async () => {
			// Arrange
			try {
				await usrRepo.deleteAll();
			} catch (ex) {
			}

			let adamOne = new UserDTO(),
				adamTwo = new UserDTO(),
				evaOne = new UserDTO(),
				evaTwo = new UserDTO();

			adamOne.id = idGen.next().toString();
			adamOne.name = 'Adam One';
			adamOne.age = 11;

			adamTwo.id = idGen.next().toString();
			adamTwo.name = 'Adam Two';
			adamTwo.age = 22;

			evaOne.id = idGen.next().toString();
			evaOne.name = 'Eva One';
			evaOne.age = 33;

			evaTwo.id = idGen.next().toString();
			evaTwo.name = null; // fail
			evaTwo.age = 44;

			let sources = [adamOne, adamTwo, evaOne, evaTwo];

			try {
				// Act
				let output = await usrRepo.createTwoCouplesWithTransaction([adamOne, adamTwo], [evaOne, evaTwo]);
				expect(output).not.to.exist;
			} catch (errors) {
				// Assert
				expect(errors).to.exist;
				console.error(errors);
				expect(errors.length).to.equal(2);
			}
			// Assert
			let count = await usrRepo.countAll();
			expect(count).to.equal(0);
		});

		it('should resolve same result if calling `closePipe` multiple times', async () => {
			// Arrange
			let adamOne = new UserDTO(),
				adamTwo = new UserDTO(),
				evaOne = new UserDTO(),
				evaTwo = new UserDTO();

			adamOne.id = idGen.next().toString();
			adamOne.name = 'Adam One';
			adamOne.age = 11;

			adamTwo.id = idGen.next().toString();
			adamTwo.name = 'Adam Two';
			adamTwo.age = 22;

			evaOne.id = idGen.next().toString();
			evaOne.name = 'Eva One';
			evaOne.age = 33;

			evaTwo.id = idGen.next().toString();
			evaTwo.name = 'Eva Two';
			evaTwo.age = 44;

			let sources = [adamOne, adamTwo, evaOne, evaTwo];

			try {
				// Act
				let flow = usrRepo.createSessionPipe([adamOne, adamTwo], [evaOne, evaTwo]),
					outputOne = await flow.closePipe(),
					outputTwo = await flow.closePipe();

				// Assert
				expect(outputOne).to.exist;
				expect(outputTwo).to.exist;
				expect(outputOne.length).to.equal(4);
				expect(outputOne.length).to.equal(outputTwo.length);
				for (let i = 0; i < outputOne.length; ++i) {
					expect(outputOne[i]).to.equal(outputTwo[i]);
				}

				// Clean up
				await Promise.all([
					usrRepo.deleteHard(outputOne.map(u => u.id))
				]);
			} catch (err) {
				console.error(err);
				expect(err).not.to.exist;
			}
		});

		it('should throw error if calling `pipe` after `closePipe`', () => {
			try {
				// Act
				let flow = usrRepo.createEmptyPipe([], []);

				flow.closePipe();
				flow.pipe(s => {
					expect(null, 'Should not go here!').to.exist;
					return Promise.reject(null);
				});
			} catch (err) {
				// Assert
				expect(err).to.exist;
				expect(err).to.be.instanceOf(MinorException);
				expect(err.message).to.equal('Pipe has been closed!');
			}
		});

		it('should execute on named connection(s) only', async () => {
			// Arrange
			let adamOne = new UserDTO(),
				adamTwo = new UserDTO();

			adamOne.id = idGen.next().toString();
			adamOne.name = 'Adam One';
			adamOne.age = 11;

			adamTwo.id = idGen.next().toString();
			adamTwo.name = 'Adam Two';
			adamTwo.age = 22;

			try {
				// Act
				let createdAdams = await usrRepo.createAdamsOnSecondConn([adamOne, adamTwo]);
				expect(createdAdams).to.exist;
				expect(createdAdams.length).to.equal(2);

				let nonExistAdamOne = await usrRepo.findOnFirstConn(createdAdams[0].id),
					nonExistAdamTwo = await usrRepo.findOnFirstConn(createdAdams[1].id);
				let refetchAdamOne = await usrRepo.findOnSecondConn(createdAdams[0].id),
					refetchAdamTwo = await usrRepo.findOnSecondConn(createdAdams[1].id);
				
				// Assert: model is inserted on second connection, but not on the first one.
				expect(nonExistAdamOne).not.to.exist;
				expect(nonExistAdamTwo).not.to.exist;
				expect(refetchAdamOne).to.exist;
				expect(refetchAdamTwo).to.exist;

				// Clean up
				await usrRepo.deleteOnSecondConn(createdAdams.map(u => u.id));
			} catch (err) {
				console.error(err);
				expect(err).not.to.exist;
			}
		});

		it('should rollback all transactions if some transactions succeed but at least one transaction fails', async () => {
			// Arrange
			try {
				await usrRepo.deleteAll();
			} catch (ex) {
			}

			let adamOne = new UserDTO(),
				adamTwo = new UserDTO(),
				evaOne = new UserDTO(),
				evaTwo = new UserDTO();

			adamOne.id = idGen.next().toString();
			adamOne.name = 'Adam One';
			adamOne.age = 11;

			adamTwo.id = idGen.next().toString();
			adamTwo.name = 'Adam Two';
			adamTwo.age = 22;

			evaOne.id = idGen.next().toString();
			evaOne.name = 'Eva One';
			evaOne.age = 33;

			evaTwo.id = idGen.next().toString();
			evaTwo.name = 'Eva Two';
			evaTwo.age = 44;

			let sources = [adamOne, adamTwo, evaOne, evaTwo];

			try {
				// Act
				let output = await usrRepo.failOnSecondTransaction([adamOne, adamTwo], [evaOne, evaTwo]);
				expect(output).not.to.exist;
			} catch (err) {
				// Assert: The second transaction failed
				expect(err).to.exist;
				console.error(err);
				expect(err).to.be.instanceOf(MinorException);
				expect(err.message).to.equal('Error on second transaction');
			}

			// Assert: The first transaction was successful...
			let firstOutput = usrRepo.firstOutput;
			expect(firstOutput).to.exist;
			expect(firstOutput.length).to.equal(4);
			firstOutput.forEach((u, i) => {
				expect(u.id).to.equal(sources[i].id);
				expect(u.name).to.equal(sources[i].name);
				expect(u.age).to.equal(sources[i].age);
			});

			// Assert: All transactions were rolled back.
			let count = await usrRepo.countAll();
			expect(count).to.equal(0);
		});
	});

	describe('create without transaction', () => {
		it('should insert a row to database without transaction', async () => {
			// Arrange
			let modelOne = new UserDTO();
			modelOne.id = idGen.next().toString();
			modelOne.name = 'One';
			modelOne.age = 29;

			let modelTwo = new UserDTO();
			modelTwo.id = idGen.next().toString();
			modelTwo.name = 'Two';
			modelTwo.age = 92;

			let sources = [modelOne, modelTwo];

			// Act
			let createdDTOs: UserDTO[] = cachedDTOs = await usrRepo.create([modelOne, modelTwo]);

			// Assert
			expect(createdDTOs).to.be.not.null;
			expect(createdDTOs.length).to.equal(sources.length);
			createdDTOs.forEach((u, i) => {
				expect(u.id).to.equal(sources[i].id);
				expect(u.name).to.equal(sources[i].name);
				expect(u.age).to.equal(sources[i].age);
			});
		});

		it('should throw error if not success on all connections', async () => {
			// Arrange
			let modelOne = new UserDTO();
			modelOne.id = idGen.next().toString();
			modelOne.name = 'One';
			modelOne.age = 29;

			let modelTwo = new UserDTO();
			modelTwo.id = idGen.next().toString();
			modelTwo.name = 'Two';
			modelTwo.age = 92;

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				filePath: CONN_FILE_2,
			});

			// Act
			try {
				let createdDTOs = await usrRepo.create([modelOne, modelTwo]);
				expect(createdDTOs).to.be.null;
			} catch (ex) {
				expect(ex).to.be.not.null;
			}
		});
	}); // END describe 'create'

	describe('patch', () => {
		it('should return an object with updated properties if found', async () => {
			// Arrange
			let newAgeOne = 45,
				newAgeTwo = 54;

			// Act
			let partials: Partial<UserDTO>[] = await usrRepo.patch([
					{ id: cachedDTOs[0].id, age: newAgeOne},
					{ id: cachedDTOs[1].id, age: newAgeTwo},
				]),
				refetchedOne: UserDTO = await usrRepo.findByPk(cachedDTOs[0].id),
				refetchedTwo: UserDTO = await usrRepo.findByPk(cachedDTOs[1].id);

			// Assert
			expect(partials).to.exist;
			expect(partials.length).to.equal(2);
			expect(partials[0].id).to.equal(cachedDTOs[0].id);
			expect(partials[0].age).to.equal(newAgeOne);
			expect(partials[0]['updatedAt']).to.exist;

			expect(partials[1].id).to.equal(cachedDTOs[1].id);
			expect(partials[1].age).to.equal(newAgeTwo);
			expect(partials[1]['updatedAt']).to.exist;

			expect(refetchedOne).to.be.not.null;
			expect(refetchedOne.id).to.equal(cachedDTOs[0].id);
			expect(refetchedOne.name).to.equal(cachedDTOs[0].name);
			expect(refetchedOne.age).to.equal(newAgeOne);

			expect(refetchedTwo).to.be.not.null;
			expect(refetchedTwo.id).to.equal(cachedDTOs[1].id);
			expect(refetchedTwo.name).to.equal(cachedDTOs[1].name);
			expect(refetchedTwo.age).to.equal(newAgeTwo);
		});

		it('should return `null` if not found', async () => {
			// Arrange
			let newAgeOne = 45,
				newAgeTwo = 54;

			// Act
			let partial: Partial<UserDTO>[] = await usrRepo.patch([
					{ id: IMPOSSIBLE_IDs[0], age: newAgeOne},
					{ id: IMPOSSIBLE_IDs[1], age: newAgeTwo}
				]),
				refetchedOne: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[0]),
				refetchedTwo: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[1]);
			
			// Assert
			expect(partial).to.exist;
			expect(partial.length).to.equal(2);
			expect(partial[0]).to.be.null;
			expect(partial[1]).to.be.null;
			// If `patch` returns `null`, but we actually find an entity with the id, then something is wrong.
			expect(refetchedOne).to.be.null;
			expect(refetchedTwo).to.be.null;
		});
	}); // END describe 'patch'

	describe('update', () => {
		it('should return an updated model if found', async () => {
			// Arrange
			let newNameOne = 'Brian',
				newNameTwo = 'Rein',
				updatedOne: UserDTO = Object.assign(new UserDTO, cachedDTOs[0]),
				updatedTwo: UserDTO = Object.assign(new UserDTO, cachedDTOs[1]);
			updatedOne.name = newNameOne;
			updatedTwo.name = newNameTwo;

			// Act
			let modified: UserDTO[] = await usrRepo.update([updatedOne, updatedTwo]),
				refetchedOne: UserDTO = await usrRepo.findByPk(cachedDTOs[0].id),
				refetchedTwo: UserDTO = await usrRepo.findByPk(cachedDTOs[1].id);

			// Assert
			expect(modified).to.exist;
			expect(modified.length).to.equal(2);

			expect(modified[0].id).to.equal(cachedDTOs[0].id);
			expect(modified[0].name).to.equal(newNameOne);
			expect(modified[0]['updatedAt']).to.equal(updatedOne['updatedAt']);

			expect(modified[1].id).to.equal(cachedDTOs[1].id);
			expect(modified[1].name).to.equal(newNameTwo);
			expect(modified[1]['updatedAt']).to.equal(updatedTwo['updatedAt']);

			expect(refetchedOne).to.exist;
			expect(refetchedOne.id).to.equal(cachedDTOs[0].id);
			expect(refetchedOne.name).to.equal(newNameOne);
			expect(refetchedOne.age).to.equal(cachedDTOs[0].age);

			expect(refetchedTwo).to.exist;
			expect(refetchedTwo.id).to.equal(cachedDTOs[1].id);
			expect(refetchedTwo.name).to.equal(newNameTwo);
			expect(refetchedTwo.age).to.equal(cachedDTOs[1].age);
		});

		it('should return `null` if not found', async () => {
			// Arrange
			let newNameOne = 'Brian',
				newNameTwo = 'Rein',
				updatedOne: UserDTO = Object.assign(new UserDTO, cachedDTOs[0]),
				updatedTwo: UserDTO = Object.assign(new UserDTO, cachedDTOs[1]);

			updatedOne.id = IMPOSSIBLE_IDs[0];
			updatedOne.name = newNameOne;

			updatedTwo.id = IMPOSSIBLE_IDs[1];
			updatedTwo.name = newNameTwo;

			// Act
			let modified: UserDTO[] = await usrRepo.update([updatedOne, updatedTwo]),
				refetchedOne: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[0]),
				refetchedTwo: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[1]);

			// Assert
			expect(modified).to.exist;
			expect(modified.length).to.equal(2);
			expect(modified[0]).to.be.null;
			expect(modified[1]).to.be.null;
			// If `update` returns `null`, but we actually find an entity with the id, then something is wrong.
			expect(refetchedOne).to.be.null;
			expect(refetchedTwo).to.be.null;
		});
	}); // END describe 'update'

	describe('delete (soft)', () => {
		it('should return a possitive number and the record is still in database', async () => {
			// Arrange
			let modelOne = new UserDTO();
			modelOne.id = idGen.next().toString();
			modelOne.name = 'One';
			modelOne.age = 29;

			let modelTwo = new UserDTO();
			modelTwo.id = idGen.next().toString();
			modelTwo.name = 'Two';
			modelTwo.age = 92;

			let sources = [modelOne, modelTwo];

			// cachedDTOs = await usrRepo.create([modelOne, modelTwo]);

			// Act
			let affectedRows: number = await usrRepo.delete([cachedDTOs[0].id, cachedDTOs[1].id]),
				refetchedOne: UserDTO = await usrRepo.findByPk(cachedDTOs[0].id),
				refetchedTwo: UserDTO = await usrRepo.findByPk(cachedDTOs[1].id);

			// Assert
			expect(affectedRows).to.be.equal(2);
			// If soft `delete` is successful, we must be able to still find that entity with the id.
			expect(refetchedOne).to.exist;
			expect(refetchedOne.deletedAt).to.exist;
			expect(refetchedTwo).to.exist;
			expect(refetchedTwo.deletedAt).to.exist;
		});

		it('should return a number and the affected records', async () => {
			// Arrange
			let modelOne = new UserDTO();
			modelOne.id = idGen.next().toString();
			modelOne.name = 'One';
			modelOne.age = 29;

			let modelTwo = new UserDTO();
			modelTwo.id = idGen.next().toString();
			modelTwo.name = 'Two';
			modelTwo.age = 92;

			// Act
			let affectedRows: number = await usrRepo.delete([cachedDTOs[0].id, IMPOSSIBLE_IDs[1]]);

			// Assert
			expect(affectedRows).to.be.equal(1);
		});
	});

	describe('delete (hard)', () => {
		it('should return a possitive number if found', async () => {
			// Act
			let affectedRows: number = await usrRepo.deleteHard([cachedDTOs[0].id, cachedDTOs[1].id]),
				refetchedOne: UserDTO = await usrRepo.findByPk(cachedDTOs[0].id),
				refetchedTwo: UserDTO = await usrRepo.findByPk(cachedDTOs[1].id);

			// Assert
			expect(affectedRows).to.be.equal(2);
			// If hard `delete` is successful, but we still find an entity with the id, then something is wrong.
			expect(refetchedOne).to.be.null;
			expect(refetchedTwo).to.be.null;
		});

		it('should return 0 if not found', async () => {
			// Act
			let affectedRows: number = await usrRepo.deleteHard(IMPOSSIBLE_IDs),
				refetchedOne: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[0]),
				refetchedTwo: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[1]);

			// Assert
			expect(affectedRows).to.equal(0);
			// If hard `delete` returns 0, but we actually find an entity with the id, then something is wrong.
			expect(refetchedOne).to.be.null;
			expect(refetchedTwo).to.be.null;
		});
	}); // END describe 'delete'
});