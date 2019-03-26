"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class VersionQueryBuilder {
    constructor(_EntityClass) {
        this._EntityClass = _EntityClass;
        this._pkProps = this._EntityClass['idProp'];
    }
    buildCountAll(prevQuery, rawQuery, opts) {
        return prevQuery.where('is_main', true);
    }
    buildDeleteHard(pk, prevQuery, rawQuery) {
        return rawQuery.deleteById(this._toArr(pk, this._pkProps));
    }
    buildExists(props, prevQuery, rawQuery, opts) {
        return prevQuery.where('is_main', true);
    }
    buildFind(pk, prevQuery, rawQuery, opts = {}) {
        let q = rawQuery.findById(this._toArr(pk, this._pkProps));
        if (opts.version) {
            q = q.where('version', opts.version);
        }
        else {
            q = q.where('is_main', true);
        }
        return q;
    }
    buildPage(pageIndex, pageSize, prevQuery, rawQuery, opts) {
        return prevQuery.where('is_main', true);
    }
    buildPatch(entity, prevQuery, rawQuery, opts) {
        return rawQuery.patch(entity)
            .whereComposite(this._EntityClass['idColumn'], '=', this._toArr(entity, this._pkProps))
            .where('is_main', true);
    }
    buildRecoverOpts(pk, prevOpts, rawOpts) {
        return prevOpts;
    }
    buildUpdate(entity, prevQuery, rawQuery, opts) {
        return rawQuery.update(entity)
            .whereComposite(this._EntityClass['idColumn'], '=', this._toArr(entity, this._pkProps))
            .where('is_main', true);
    }
    _toArr(pk, arr) {
        return arr.map(c => pk[c]);
    }
}
exports.VersionQueryBuilder = VersionQueryBuilder;
//# sourceMappingURL=VersionQueryBuilder.js.map