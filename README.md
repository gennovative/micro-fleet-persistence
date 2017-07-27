# Gennova backend persistence library

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
## 1.0.0
- Converted `DatabaseAdapter` into `KnexDatabaseConnector` which supports executing same query on multiple database connections at the same time.
- `RepositoryBase` no longer couples with `objection` and `knex`.
- **Test coverage:** 100%

## 0.1.0
- EntityBase
- RepositoryBase