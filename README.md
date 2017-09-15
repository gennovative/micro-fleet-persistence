# Gennova backend persistence library

Provides base repository class and database connector that helps connect to database and map db tables to JS objects (ORM).

## USAGE

`import 'automapper-ts';` only once in the entire program.

## INSTALLATION

`npm i`: To install dependencies.
`gulp` to transpile TypeScript.

## DEVELOPMENT

`gulp watch`: To transpile and watch for edit.

## RELEASE

`gulp release`: To transpile and create `app.d.ts` definition file.

# Versions

## 2.1.0 (Coming soon)
- **RepositoryBase** will supports version controlling.

## 2.0.0

- [Breaking change] **RepositoryBase** now supports batch operations and multi-tenancy.
- **RepositoryBase** unit tests provide generated IDs instead of auto-increment database IDs.
- **DatabaseAddOn**: moved from `back-lib-foundation`.
- Moved **IConnectionDetail** to `back-lib-common-contracts`.
- **AtomicSessionFlow** rejects with error when no named connection is found.

## 1.0.0

- Converted **DatabaseAdapter** into **KnexDatabaseConnector** which supports executing same query on multiple database connections at the same time.
- **RepositoryBase** no longer couples with `objection` and `knex`.
- Makes sure all date values loaded from database are converted as UTC format.
- **AtomicSessionFactory**, **AtomicSessionFlow** (use with **AtomicSession**): supports transactional queries to provide atomic operation. Their unittests are skipped, read the `console.warn(...)` in the unittest before running.
- **Test coverage:** 100%

## 0.1.0
- EntityBase
- RepositoryBase