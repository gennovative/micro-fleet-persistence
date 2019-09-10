/**
 * Generates random a pseudo big int.
 */
export function genBigInt(): string {
    const randFLoat = Math.random() * Number.MAX_SAFE_INTEGER
    const randInt = randFLoat.toFixed(0)
    return BigInt(randInt).toString()
}
