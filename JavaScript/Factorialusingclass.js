class Factorial {
  constructor(n) {
    this.n = n;
    this.memo = new Map(); // Memoization cache
    this.history = []; // Calculation history
  }

  // Main calculation method with multiple approaches
  calculate(method = 'iterative') {
    if (this.n < 0) {
      throw new Error('Factorial is not defined for negative numbers');
    }
    
    if (!Number.isInteger(this.n)) {
      throw new Error('Factorial is only defined for integers');
    }

    const startTime = performance.now();
    let result;

    switch (method) {
      case 'recursive':
        result = this._recursive(this.n);
        break;
      case 'iterative':
        result = this._iterative();
        break;
      case 'memoized':
        result = this._memoized(this.n);
        break;
      case 'reduce':
        result = this._reduce();
        break;
      case 'bigint':
        result = this._bigInt();
        break;
      default:
        result = this._iterative();
    }

    const endTime = performance.now();
    const calculationTime = endTime - startTime;

    // Store calculation history
    this.history.push({
      input: this.n,
      result: result,
      method: method,
      time: calculationTime,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Traditional recursive approach
  _recursive(num) {
    if (num <= 1) return 1;
    return num * this._recursive(num - 1);
  }

  // Iterative approach (most efficient for large numbers)
  _iterative() {
    let result = 1;
    for (let i = 2; i <= this.n; i++) {
      result *= i;
    }
    return result;
  }

  // Memoized recursive approach
  _memoized(num) {
    if (num <= 1) return 1;
    
    if (this.memo.has(num)) {
      return this.memo.get(num);
    }
    
    const result = num * this._memoized(num - 1);
    this.memo.set(num, result);
    return result;
  }

  // Functional approach using reduce
  _reduce() {
    if (this.n === 0) return 1;
    
    const sequence = Array.from({length: this.n}, (_, i) => i + 1);
    return sequence.reduce((acc, curr) => acc * curr, 1);
  }

  // BigInt version for very large numbers
  _bigInt() {
    let result = 1n;
    const bigN = BigInt(this.n);
    
    for (let i = 2n; i <= bigN; i++) {
      result *= i;
    }
    return result;
  }

  // Calculate double factorial (n!!)
  doubleFactorial() {
    if (this.n < 0) throw new Error('Double factorial not defined for negative numbers');
    
    let result = 1;
    for (let i = this.n; i > 0; i -= 2) {
      result *= i;
    }
    return result;
  }

  // Calculate approximation using Stirling's formula
  stirlingApproximation() {
    if (this.n <= 0) return 1;
    
    const n = this.n;
    return Math.sqrt(2 * Math.PI * n) * Math.pow(n / Math.E, n) * 
           (1 + 1/(12*n) + 1/(288*n*n) - 139/(51840*n*n*n));
  }

  // Get the number of trailing zeros in factorial
  trailingZeros() {
    let count = 0;
    for (let i = 5; this.n / i >= 1; i *= 5) {
      count += Math.floor(this.n / i);
    }
    return count;
  }

  // Get calculation history
  getHistory() {
    return this.history;
  }

  // Clear calculation history
  clearHistory() {
    this.history = [];
    this.memo.clear();
  }

  // Get statistics about calculations
  getStats() {
    if (this.history.length === 0) {
      return { totalCalculations: 0, averageTime: 0, methodsUsed: [] };
    }

    const totalTime = this.history.reduce((sum, calc) => sum + calc.time, 0);
    const methodsUsed = [...new Set(this.history.map(calc => calc.method))];

    return {
      totalCalculations: this.history.length,
      averageTime: totalTime / this.history.length,
      methodsUsed: methodsUsed,
      fastestCalculation: Math.min(...this.history.map(calc => calc.time)),
      slowestCalculation: Math.max(...this.history.map(calc => calc.time))
    };
  }

  // Static method to calculate factorial without creating instance
  static compute(n, method = 'iterative') {
    const factorial = new Factorial(n);
    return factorial.calculate(method);
  }

  // Static method to check if a number is a factorial number
  static isFactorial(num) {
    if (num <= 0) return false;
    
    let i = 1;
    let product = 1;
    
    while (product < num) {
      product *= i;
      if (product === num) return true;
      i++;
    }
    
    return product === num;
  }

  // Generate factorial sequence up to n
  static generateSequence(limit) {
    const sequence = [];
    let factorial = 1;
    
    for (let i = 0; i <= limit; i++) {
      if (i > 0) {
        factorial *= i;
      }
      sequence.push(factorial);
    }
    
    return sequence;
  }
}

// Extended class for advanced factorial operations
class AdvancedFactorial extends Factorial {
  constructor(n) {
    super(n);
  }

  // Calculate binomial coefficient (n choose k)
  binomialCoefficient(k) {
    if (k < 0 || k > this.n) return 0;
    if (k === 0 || k === this.n) return 1;
    
    // Use the property: C(n, k) = C(n, n-k)
    k = Math.min(k, this.n - k);
    
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result = result * (this.n - k + i) / i;
    }
    
    return Math.round(result); // Round to handle floating point precision
  }

  // Calculate gamma function approximation (extension of factorial to real numbers)
  gammaFunction() {
    if (this.n <= 0 && Number.isInteger(this.n)) {
      throw new Error('Gamma function undefined for negative integers');
    }
    
    // Lanczos approximation
    const z = this.n;
    const p = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    
    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * this.gammaFunction(1 - z));
    }
    
    z -= 1;
    let x = 0.99999999999980993;
    
    for (let i = 0; i < p.length; i++) {
      x += p[i] / (z + i + 1);
    }
    
    const t = z + p.length - 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  // Calculate multifactorial (n!^(m))
  multiFactorial(m) {
    if (m <= 0) throw new Error('Multi factorials require positive step size');
    if (this.n < 0) throw new Error('Multi factorial not defined for negative numbers');
    
    let result = 1;
    for (let i = this.n; i > 0; i -= m) {
      result *= i;
    }
    return result;
  }
}

// Demo and testing
function demonstrateFactorial() {
  console.log('=== Factorial Class Demonstration ===\n');

  // Basic usage
  const number = 5;
  const factorial = new Factorial(number);

  console.log(`Basic factorial of ${number}:`);
  console.log(`Iterative: ${factorial.calculate('iterative')}`);
  console.log(`Recursive: ${factorial.calculate('recursive')}`);
  console.log(`Memoized: ${factorial.calculate('memoized')}`);
  console.log(`Using reduce: ${factorial.calculate('reduce')}`);
  console.log(`Double factorial: ${factorial.doubleFactorial()}`);
  console.log(`Stirling approximation: ${factorial.stirlingApproximation()}`);
  console.log(`Trailing zeros: ${factorial.trailingZeros()}\n`);

  // Large number with BigInt
  const largeFactorial = new Factorial(25);
  console.log(`Factorial of 25 (using BigInt): ${largeFactorial.calculate('bigint')}\n`);

  // Static method usage
  console.log('Static method examples:');
  console.log(`Factorial of 6: ${Factorial.compute(6)}`);
  console.log(`Is 120 a factorial? ${Factorial.isFactorial(120)}`);
  console.log(`Factorial sequence up to 5: ${Factorial.generateSequence(5)}\n`);

  // Advanced operations
  const advanced = new AdvancedFactorial(10);
  console.log('Advanced operations:');
  console.log(`Binomial coefficient C(10, 3): ${advanced.binomialCoefficient(3)}`);
  console.log(`Multi factorial 10!!!: ${advanced.multiFactorial(3)}\n`);

  // Statistics
  console.log('Calculation statistics:');
  console.log(factorial.getStats());
}

// Run demonstration
demonstrateFactorial();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Factorial, AdvancedFactorial };
}
