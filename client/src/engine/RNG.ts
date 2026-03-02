/**
 * LCG (Linear Congruential Generator) random number generator.
 * Matches the server-side MapGen.ts implementation exactly so that
 * client-side world generation produces identical results.
 *
 * Formula: seed = (a * seed + c) % m
 */
export class RNG {
  private static readonly m = 0x80000000; // 2^31
  private static readonly a = 1103515245;
  private static readonly c = 12345;

  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0; // coerce to unsigned 32-bit integer
  }

  /**
   * Advance the generator and return a value in [0, 1).
   */
  next(): number {
    this.seed = (RNG.a * this.seed + RNG.c) % RNG.m;
    return this.seed / RNG.m;
  }

  /**
   * Return a random integer in the inclusive range [min, max].
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Return a random float in the range [min, max).
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

export default RNG;
