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
  
    _factorial(num) {
      if (num ==0 || num==1) 
          return 1;
      return num * this._factorial(num - 1);
    }
    return result;
  }
}

// Demo and testing
function demonstrateFactorial() {
  console.log('=== Factorial Class Demonstration ===\n');

  // Basic usage
  const number = 5;
  const factorialObj = new Factorial(number);
  console.log(`Factorial of ${number} is: ${factorialObj.calculate()}`);
  
