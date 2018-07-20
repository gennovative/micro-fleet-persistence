"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MonoQueryBuilder {
    constructor(_EntityClass) {
        this._EntityClass = _EntityClass;
        this._pkProp = this._EntityClass['idProp'][0];
    }
    buildCountAll(prevQuery, rawQuery, opts) {
        const q = rawQuery.count(`${this._pkProp} as total`);
        return (opts.excludeDeleted) ? q.whereNull('deleted_at') : q;
    }
    buildDeleteHard(pk, prevQuery, rawQuery) {
        return rawQuery.deleteById(pk);
    }
    buildExists(uniqVals, prevQuery, rawQuery, opts) {
        let q = rawQuery.count(`${this._pkProp} as total`);
        if (uniqVals && uniqVals.length) {
            q = q.where(builder => {
                this._EntityClass['uniqColumn'].forEach((c, i) => {
                    let v = uniqVals[i];
                    if (v === null) {
                        builder.orWhereNull(c);
                    }
                    else if (v !== undefined) {
                        builder.orWhere(c, '=', v);
                    }
                });
            });
        }
        return (opts.excludeDeleted) ? q.whereNull('deleted_at') : q;
    }
    buildFind(pk, prevQuery, rawQuery, opts = {}) {
        return rawQuery.findById(pk);
    }
    buildPage(pageIndex, pageSize, prevQuery, rawQuery, opts) {
        let q = rawQuery.page(pageIndex, pageSize);
        if (opts.sortBy) {
            let direction = opts.sortType || 'asc';
            q = q.orderBy(opts.sortBy, direction);
        }
        return (opts.excludeDeleted) ? q.whereNull('deleted_at') : q;
    }
    buildPatch(entity, prevQuery, rawQuery, opts) {
        return rawQuery.patch(entity).where(this._pkProp, entity[this._pkProp]);
    }
    buildRecoverOpts(pk, prevOpts, rawOpts) {
        return {
            excludeDeleted: false,
        };
    }
    buildUpdate(entity, prevQuery, rawQuery, opts) {
        return rawQuery.update(entity).where(this._pkProp, entity[this._pkProp]);
    }
}
exports.MonoQueryBuilder = MonoQueryBuilder;
//# sourceMappingURL=MonoQueryBuilder.js.map