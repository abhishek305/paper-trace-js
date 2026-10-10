export type Example = { id: string; title: string; code: string };

export const examples: Example[] = [
  {
    id: 'star-pyramid',
    title: 'Star pyramid',
    code: `const rows = 4;
for (let i = 1; i <= rows; i++) {
  let line = '';
  for (let j = 1; j <= i; j++) {
    line += '*';
  }
  console.log(line);
}`,
  },
  {
    id: 'number-triangle',
    title: 'Number triangle',
    code: `const n = 5;
for (let i = 1; i <= n; i++) {
  let row = '';
  for (let j = 1; j <= i; j++) {
    row += j + ' ';
  }
  console.log(row);
}`,
  },
  {
    id: 'binary-search',
    title: 'Binary search',
    code: `const sorted = [2, 5, 8, 12, 16, 23, 38];
const target = 23;
let low = 0;
let high = sorted.length - 1;
let found = -1;
while (low <= high) {
  const mid = Math.floor((low + high) / 2);
  if (sorted[mid] === target) {
    found = mid;
    break;
  }
  if (sorted[mid] < target) low = mid + 1;
  else high = mid - 1;
}
console.log(found);`,
  },
  {
    id: 'factorial',
    title: 'Factorial (recursive)',
    code: `function fact(n) {
  if (n <= 1) return 1;
  return n * fact(n - 1);
}
console.log(fact(5));`,
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci (recursive)',
    code: `function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
console.log(fib(6));`,
  },
  {
    id: 'bubble-sort',
    title: 'Bubble sort',
    code: `const arr = [5, 3, 8, 1, 2];
for (let i = 0; i < arr.length; i++) {
  for (let j = 0; j < arr.length - i - 1; j++) {
    if (arr[j] > arr[j + 1]) {
      const t = arr[j];
      arr[j] = arr[j + 1];
      arr[j + 1] = t;
    }
  }
}
console.log(JSON.stringify(arr));`,
  },
  {
    id: 'selection-sort',
    title: 'Selection sort',
    code: `const arr = [4, 2, 7, 1, 3];
for (let i = 0; i < arr.length; i++) {
  let min = i;
  for (let j = i + 1; j < arr.length; j++) {
    if (arr[j] < arr[min]) min = j;
  }
  const t = arr[i];
  arr[i] = arr[min];
  arr[min] = t;
}
console.log(JSON.stringify(arr));`,
  },
  {
    id: 'two-sum',
    title: 'Two sum (Map)',
    code: `const nums = [2, 7, 11, 15];
const target = 9;
const seen = new Map();
let answer = [-1, -1];
for (let i = 0; i < nums.length; i++) {
  const need = target - nums[i];
  if (seen.has(need)) {
    answer = [seen.get(need), i];
    break;
  }
  seen.set(nums[i], i);
}
console.log(JSON.stringify(answer));`,
  },
  {
    id: 'linked-list',
    title: 'Linked list (class)',
    code: `class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}
const head = new Node(1);
head.next = new Node(2);
head.next.next = new Node(3);
let sum = 0;
let cur = head;
while (cur !== null) {
  sum += cur.value;
  cur = cur.next;
}
console.log(sum);`,
  },
  {
    id: 'stack-queue',
    title: 'Stack and queue',
    code: `const stack = [];
stack.push(1);
stack.push(2);
stack.push(3);
console.log(stack.pop());
const queue = [1, 2, 3];
console.log(queue.shift());
queue.push(4);
console.log(JSON.stringify(queue));`,
  },
];
