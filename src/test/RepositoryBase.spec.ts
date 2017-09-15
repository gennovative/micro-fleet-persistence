import { expect } from 'chai';

import { DbClient } from 'back-lib-common-constants';
import { InvalidArgumentException, MinorException } from 'back-lib-common-util';
import { PagedArray, ModelAutoMapper, AtomicSession } from 'back-lib-common-contracts';
import { IdGenerator } from 'back-lib-id-generator';

import { RepositoryBase, EntityBase, QueryCallback, IDatabaseConnector,
		KnexDatabaseConnector, AtomicSessionFactory, AtomicSessionFlow } from '../app';
import DB_DETAILS from './database-details';


const CONN_FILE = `${process.cwd()}/database-adapter-test.sqlite`,
	CONN_FILE_2 = `${process.cwd()}/database-adapter-test-second.sqlite`,
	// For SQLite3 file
	// DB_TABLE = 'userdata',

	// For PostgreSQL
	DB_TABLE = 'userdata',

	IMPOSSIBLE_ID = '0';


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
	public static readonly uniqColumn = ['name', 'age'];

	public static translator: ModelAutoMapper<UserEntity> = new ModelAutoMapper(UserEntity);

	// NOTE: Class properties must be initialized, otherwise they
	// will disappear in transpiled code.
	public name: string = undefined;
	public age: number = undefined;
	public deletedAt: number = undefined;
}

type NameAgeUk = {
	name?: string,
	age?: number
};

class UserRepo extends RepositoryBase<UserEntity, UserDTO, BigSInt, NameAgeUk> {
	
	private _sessionFactory: AtomicSessionFactory;

	constructor(
		dbConnector: IDatabaseConnector
	) {
		super(UserEntity, dbConnector);
		this._sessionFactory = new AtomicSessionFactory(dbConnector);
	}

	public createCoupleWithTransaction(adam: UserDTO, eva: UserDTO): Promise<UserDTO[]> {
		return this._sessionFactory.startSession()
			.pipe(atomicSession => this.create(adam, { atomicSession }))
			.pipe((atomicSession, createdAdam) => {
				if (!createdAdam) {
					debugger;
					// In fact, this scenario should never happen.
					// Because when we come to this point, the previous task must have been successfull.
					return Promise.reject('Cannot live without my husband!');
				}
				return this.create(eva, { atomicSession })
					.then(createdEva => [createdAdam, createdEva]);
			})
			.closePipe();
	}

	private _counter = 0;
	public firstOutput;
	public failOnSecondTransaction(adam: UserDTO, eva: UserDTO): Promise<UserDTO[]> {
		return this._sessionFactory.startSession()
			.pipe(atomicSession => this.create(adam, { atomicSession }))
			.pipe((atomicSession, createdAdam) => {
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
						this.create(eva, { atomicSession })
							.then(createdEva => {
								this.firstOutput = [createdAdam, createdEva];
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

	public createAdamOnSecondConn(adam: UserDTO): Promise<UserDTO> {
		return this._sessionFactory.startSession('sec')
			.pipe(atomicSession => this.create(adam, { atomicSession }))
			.closePipe();
	}

	public createAdamOnNonExistConn(adam: UserDTO): Promise<UserDTO> {
		return this._sessionFactory.startSession('nonexist')
			.pipe(atomicSession => this.create(adam, { atomicSession }))
			.closePipe();
	}

	public createSessionPipe(adam: UserDTO, eva: UserDTO): AtomicSessionFlow {
		return this._sessionFactory.startSession()
			.pipe(atomicSession => this.create(adam, { atomicSession }))
			.pipe((atomicSession, createdAdam) => {
				if (!createdAdam) {
					debugger;
					// In fact, this scenario should never happen.
					// Because when we come to this point, the previous task must have been successfull.
					return Promise.reject('Cannot live without my husband!');
				}
				return this.create(eva, { atomicSession })
					.then(createdEva => [createdAdam, createdEva]);
			});
			//.closePipe(); // Not closing pipe
	}

	public createEmptyPipe(adam: UserDTO, eva: UserDTO): AtomicSessionFlow {
		return this._sessionFactory.startSession()
			.pipe(session => {
				return Promise.resolve('Nothing');
			});
			//.closePipe(); // Not closing pipe
	}

	public async findOnFirstConn(id: BigSInt): Promise<UserDTO> {
		let foundEnt: UserEntity = await this._processor.executeQuery(query => {
				return query.findById(id);
			}, null, '0'); // Executing on first connection only.

		return this._processor.toDTO(foundEnt, false);
	}

	public async findOnSecondConn(id: BigSInt): Promise<UserDTO> {
		let foundEnt: UserEntity = await this._processor.executeQuery(query => {
				return query.findById(id);
			}, null, 'sec'); // Executing on second connection (named 'sec').

		return this._processor.toDTO(foundEnt, false);
	}

	public async deleteOnSecondConn(id: BigSInt): Promise<UserDTO> {
		let affectedRows = await this._processor.executeCommand(query => {
				return query.deleteById(id);
			}, null, 'sec');
		return affectedRows;
	}

	public deleteAll(): Promise<void> {
		return this._processor.executeCommand(query => query.delete());
	}
}

let cachedDTO: UserDTO,
	dbConnector: IDatabaseConnector,
	usrRepo: UserRepo,
	idGen = new IdGenerator();

// These test suites make real changes to SqlLite file or PostgreSQl server.
describe('RepositoryBase', function() {
	this.timeout(10000);

	beforeEach('Initialize db adapter', () => {
		dbConnector = new KnexDatabaseConnector();
		// // For SQLite3 file
		// dbConnector.addConnection({
			// clientName: DbClient.SQLITE3,
			// filePath: CONN_FILE,
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

			usrRepo = new UserRepo(dbConnector);
		});

		it('should insert two rows on each database', async () => {
			// Arrange
			let modelOne = new UserDTO(),
				modelTwo = new UserDTO();
			modelOne.id = idGen.nextBigInt().toString();
			modelOne.name = 'One';
			modelOne.age = 11;

			modelTwo.id = idGen.nextBigInt().toString();
			modelTwo.name = 'Two';
			modelTwo.age = 22;

			try {
				// Act
				let output = await usrRepo.createCoupleWithTransaction(modelOne, modelTwo);
				expect(output).to.exist;

				let [createdOne, createdTwo] = output;
				// Assert
				expect(createdOne).to.exist;
				expect(createdOne.id).to.be.equal(modelOne.id);
				expect(createdOne.name).to.equal(modelOne.name);
				expect(createdOne.age).to.equal(modelOne.age);

				expect(createdTwo).to.exist;
				expect(createdTwo.id).to.be.equal(modelTwo.id);
				expect(createdTwo.name).to.equal(modelTwo.name);
				expect(createdTwo.age).to.equal(modelTwo.age);

				// Clean up
				await Promise.all([
					usrRepo.deleteHard(createdOne.id),
					usrRepo.deleteHard(createdTwo.id)
				]);
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

			let modelOne = new UserDTO(),
				modelTwo = new UserDTO();
			modelOne.id = idGen.nextBigInt().toString();
			modelOne.name = 'One';
			modelOne.age = 11;

			modelTwo.id = idGen.nextBigInt().toString();
			modelTwo.name = null; // fail
			modelTwo.age = 22;

			try {
				// Act
				let output = await usrRepo.createCoupleWithTransaction(modelOne, modelTwo);
				expect(output).not.to.exist;
			} catch (errors) {
				// Assert
				expect(errors).to.exist;
				expect(errors.length).to.equal(2);
			}
			// Assert
			let count = await usrRepo.countAll();
			expect(count).to.equal(0);
		});

		it('should resolve same result if calling `closePipe` multiple times', async () => {
			// Arrange
			let modelOne = new UserDTO(),
				modelTwo = new UserDTO();
			modelOne.id = idGen.nextBigInt().toString();
			modelOne.name = 'One';
			modelOne.age = 11;

			modelTwo.id = idGen.nextBigInt().toString();
			modelTwo.name = 'Two';
			modelTwo.age = 22;

			try {
				// Act
				let flow = usrRepo.createSessionPipe(modelOne, modelTwo),
					outputOne = await flow.closePipe(),
					outputTwo = await flow.closePipe();

				// Assert
				expect(outputOne).to.exist;
				expect(outputTwo).to.exist;
				expect(outputOne[0]).to.equal(outputTwo[0]);
				expect(outputOne[1]).to.equal(outputTwo[1]);

				// Clean up
				await Promise.all([
					usrRepo.deleteHard(outputOne[0].id),
					usrRepo.deleteHard(outputOne[1].id)
				]);
			} catch (err) {
				console.error(err);
				expect(err).not.to.exist;
			}
		});

		it('should throw error if calling `pipe` after `closePipe`', () => {
			// Arrange
			let modelOne = new UserDTO(),
				modelTwo = new UserDTO();
			modelOne.id = idGen.nextBigInt().toString();
			modelOne.name = 'One';
			modelOne.age = 11;

			modelTwo.id = idGen.nextBigInt().toString();
			modelTwo.name = 'Two';
			modelTwo.age = 22;

			try {
				// Act
				let flow = usrRepo.createEmptyPipe(modelOne, modelTwo);

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

		it('should throw error if executing on non-existing named connection', async () => {
			// Arrange
			let adam = new UserDTO();
			adam.id = idGen.nextBigInt().toString();
			adam.name = 'One';
			adam.age = 11;

			try {
				// Act
				let createdAdam = await usrRepo.createAdamOnNonExistConn(adam);
				expect(createdAdam).not.to.exist;
			} catch (err) {
				expect(err).to.exist;
				expect(err.message).to.equal('No transaction was created!');
			}
		});

		it('should execute on named connection(s) only', async () => {
			// Arrange
			let adam = new UserDTO();
			adam.id = idGen.nextBigInt().toString();
			adam.name = 'One';
			adam.age = 11;

			try {
				// Act
				let createdAdam = await usrRepo.createAdamOnSecondConn(adam);
				expect(createdAdam).to.exist;

				let nonExistAdam = await usrRepo.findOnFirstConn(createdAdam.id);
				let refetchAdam = await usrRepo.findOnSecondConn(createdAdam.id);
				
				// Assert: model is inserted on second connection, but not on the first one.
				expect(nonExistAdam).not.to.exist;
				expect(refetchAdam).to.exist;

				// Clean up
				await usrRepo.deleteOnSecondConn(createdAdam.id);
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

			let modelOne = new UserDTO(),
				modelTwo = new UserDTO();
			modelOne.id = idGen.nextBigInt().toString();
			modelOne.name = 'One';
			modelOne.age = 11;

			modelTwo.id = idGen.nextBigInt().toString();
			modelTwo.name = 'Two';
			modelTwo.age = 22;

			try {
				// Act
				let output = await usrRepo.failOnSecondTransaction(modelOne, modelTwo);
				expect(output).not.to.exist;

			} catch (err) {
				// Assert: The second transaction failed
				expect(err).to.exist;
				expect(err).to.be.instanceOf(MinorException);
				expect(err.message).to.equal('Error on second transaction');
			}

			// Assert: The first transaction was successful...
			let firstOutput = usrRepo.firstOutput;
			expect(firstOutput).to.exist;
			expect(firstOutput.length).to.equal(2);

			expect(firstOutput[0].id).to.be.equal(modelOne.id);
			expect(firstOutput[0].name).to.equal('One');

			expect(firstOutput[1].id).to.be.equal(modelTwo.id);
			expect(firstOutput[1].name).to.equal('Two');

			// Assert: All transactions were rolled back.
			let count = await usrRepo.countAll();
			expect(count).to.equal(0);
		});
	});

	describe('create without transaction', () => {
		it('should insert a row to database without transaction', async () => {
			// Arrange
			let model = new UserDTO();
			model.id = idGen.nextBigInt().toString();
			model.name = 'Hiri';
			model.age = 39;

			// Act
			let createdDTO: UserDTO = cachedDTO = await usrRepo.create(model);

			// Assert
			expect(createdDTO).to.be.not.null;
			expect(createdDTO.id).to.equal(model.id);
			expect(createdDTO.name).to.equal(model.name);
			expect(createdDTO.age).to.equal(model.age);
		});

		it('should throw error if not success on all connections', async () => {
			// Arrange
			let model = new UserDTO();
			model.id = idGen.nextBigInt().toString();
			model.name = 'Hiri';
			model.age = 49;

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				filePath: CONN_FILE_2,
			});

			// Act
			try {
				let createdDTO: UserDTO = await usrRepo.create(model);
				expect(createdDTO).to.be.null;
			} catch (ex) {
				expect(ex).to.be.not.null;
			}
		});
	}); // END describe 'create'

	describe('exists', () => {
		it('should return `true` if found', async () => {
			// Act
			let isExisting: boolean = await usrRepo.exists({ 
				name: cachedDTO.name,
				age: 123
			}, {
				includeDeleted: true
			});

			// Assert
			expect(isExisting).to.be.true;
		});

		it('should return `false` if not found', async () => {
			// Act
			let isExisting: boolean = await usrRepo.exists({
				name: IMPOSSIBLE_ID
			});

			// Assert
			expect(isExisting).to.be.false;
		});
	}); // END describe 'exists'

	describe('findByPk', () => {
		it('should return an model instance if found', async () => {
			// Act
			let foundDTO: UserDTO = await usrRepo.findByPk(cachedDTO.id);

			// Assert
			expect(foundDTO).to.be.not.null;
			expect(foundDTO.id).to.equal(cachedDTO.id);
			expect(foundDTO.name).to.equal(cachedDTO.name);
			expect(foundDTO.age).to.equal(cachedDTO.age);
		});

		it('should return `null` if not found', async () => {
			// Act
			let model: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_ID);

			// Assert
			expect(model).to.be.null;
		});
	}); // END describe 'findByPk'

	describe('patch', () => {
		it('should return an object with updated properties if found', async () => {
			// Arrange
			let newAge = 45;

			// Act
			let partial: Partial<UserDTO> = await usrRepo.patch({ id: cachedDTO.id, age: newAge}),
				refetchedDTO: UserDTO = await usrRepo.findByPk(cachedDTO.id);

			// Assert
			expect(partial.id).to.equal(cachedDTO.id);
			expect(partial.age).to.equal(newAge);
			expect(refetchedDTO).to.be.not.null;
			expect(refetchedDTO.id).to.equal(cachedDTO.id);
			expect(refetchedDTO.name).to.equal(cachedDTO.name);
			expect(refetchedDTO.age).to.equal(newAge);
		});

		it('should return `null` if not found', async () => {
			// Arrange
			let newAge = 45;

			// Act
			let partial: Partial<UserDTO> = await usrRepo.patch({ id: IMPOSSIBLE_ID, age: newAge}),
				refetchedDTO: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_ID);
			
			// Assert
			expect(partial).to.be.null;
			// If `patch` returns `null`, but we actually find an entity with the id, then something is wrong.
			expect(refetchedDTO).to.be.null;
		});
	}); // END describe 'patch'

	describe('update', () => {
		it('should return an updated model if found', async () => {
			// Arrange
			let newName = 'Brian',
				updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO);
			updatedDTO.name = newName;

			// Act
			let modified: UserDTO = await usrRepo.update(updatedDTO),
				refetchedDTO: UserDTO = await usrRepo.findByPk(cachedDTO.id);

			// Assert
			expect(modified).to.exist;
			expect(modified.id).to.equal(cachedDTO.id);
			expect(modified.name).to.equal(newName);
			expect(refetchedDTO).to.be.not.null;
			expect(refetchedDTO.id).to.equal(cachedDTO.id);
			expect(refetchedDTO.name).to.equal(newName);
			expect(refetchedDTO.age).to.equal(cachedDTO.age);
		});

		it('should return `null` if not found', async () => {
			// Arrange
			let newName = 'Brian',
				updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO);
			updatedDTO.id = IMPOSSIBLE_ID;
			updatedDTO.name = newName;

			// Act
			let modified: UserDTO = await usrRepo.update(updatedDTO),
				refetchedDTO: UserDTO = await usrRepo.findByPk(updatedDTO.id);

			// Assert
			expect(modified).to.be.null;
			// If `update` returns `null`, but we actually find an entity with the id, then something is wrong.
			expect(refetchedDTO).to.be.null;
		});
	}); // END describe 'update'

	describe('delete (soft)', () => {
		it('should return a possitive number and the record is still in database', async () => {
			// Act
			let affectedRows: number = await usrRepo.deleteSoft(cachedDTO.id),
				refetchedDTO: UserDTO = await usrRepo.findByPk(cachedDTO.id);

			// Assert
			expect(affectedRows).to.be.greaterThan(0);
			// If `delete` is successful, we must be able to still find that entity with the id.
			expect(refetchedDTO).to.exist;
			expect(refetchedDTO.deletedAt).to.exist;
		});

		it('should return 0 if no affected records', async () => {
			// Act
			let affectedRows: number = await usrRepo.deleteSoft(IMPOSSIBLE_ID);

			// Assert
			expect(affectedRows).to.be.equal(0);
		});
	});

	describe('recover', () => {
		it('should return a possitive number if success', async () => {
			// Act
			let affectedRows: number = await usrRepo.recover(cachedDTO.id),
				refetchedDTO: UserDTO = await usrRepo.findByPk(cachedDTO.id);

			// Assert
			expect(affectedRows).to.be.greaterThan(0);
			expect(refetchedDTO).to.exist;
			expect(refetchedDTO.deletedAt).to.be.null;
		});

		it('should return 0 if no affected records', async () => {
			// Act
			let affectedRows: number = await usrRepo.recover(IMPOSSIBLE_ID);

			// Assert
			expect(affectedRows).to.be.equal(0);
		});

		it('should throw error if there is an active record with same unique keys', async () => {
			// Act
			try {
				let affectedRows: number = await usrRepo.recover(cachedDTO.id);
				expect(affectedRows).not.to.exist;
			} catch (ex) {
				expect(ex).to.be.instanceOf(MinorException);
				expect(ex.message).to.equal('DUPLICATE_UNIQUE_KEY');
			}
		});
	});

	describe('delete (hard)', () => {
		it('should return a possitive number if found', async () => {
			// Act
			let affectedRows: number = await usrRepo.deleteHard(cachedDTO.id),
				refetchedDTO: UserDTO = await usrRepo.findByPk(cachedDTO.id);

			// Assert
			expect(affectedRows).to.be.greaterThan(0);
			// If `delete` is successful, but we still find an entity with the id, then something is wrong.
			expect(refetchedDTO).to.be.null;
		});

		it('should return 0 if not found', async () => {
			// Act
			let affectedRows: number = await usrRepo.deleteHard(IMPOSSIBLE_ID),
				refetchedDTO: UserDTO = await usrRepo.findByPk(IMPOSSIBLE_ID);

			// Assert
			expect(affectedRows).to.equal(0);
			// If `delete` returns 0, but we actually find an entity with the id, then something is wrong.
			expect(refetchedDTO).to.be.null;
		});
	}); // END describe 'delete'
	
	describe('page', () => {
		it('Should return `null` if there is no records', async () => {
			// Arrange
			const PAGE = 1,
				SIZE = 10;

			// Deletes all from DB
			await usrRepo.deleteAll();

			// Act
			let models: PagedArray<UserDTO> = await usrRepo.page(PAGE, SIZE, {
				includeDeleted: true
			});

			// Assert
			expect(models).to.be.null;
		});

		it('Should return specified number of items if there are more records in database', async () => {
			// Arrange
			const PAGE = 1,
				SIZE = 10,
				TOTAL = SIZE * 2;
			let model: UserDTO;

			// Deletes all from DB
			await usrRepo.deleteAll();

			for (let i = 0; i < TOTAL; i++) {
				model = new UserDTO();
				model.id = idGen.nextBigInt().toString();
				model.name = 'Hiri' + i;
				model.age = Math.ceil(29 * Math.random());
				await usrRepo.create(model);
			}

			// Act
			let models: PagedArray<UserDTO> = await usrRepo.page(PAGE, SIZE);

			// Assert
			expect(models).to.be.not.null;
			expect(models.length).to.be.equal(SIZE);
			expect(models.total).to.be.equal(TOTAL);
		});
	}); // END describe 'page'

	describe('countAll', () => {
		it('Should return a positive number if there are records in database.', async () => {
			// Act
			let count = await usrRepo.countAll();

			// Assert
			expect(count).to.be.greaterThan(0);
		});

		it('Should return 0 if there is no records in database.', async () => {
			// Deletes all from DB
			await usrRepo.deleteAll();

			// Act
			let count = await usrRepo.countAll({ includeDeleted: true });

			// Assert
			expect(count).to.equal(0);
		});
	}); // END describe 'count'

});