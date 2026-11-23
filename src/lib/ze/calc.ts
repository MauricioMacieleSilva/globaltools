// Calculadora segura para o Zé: avalia expressões matemáticas sem eval().
// Suporta + - * / ^ %, parênteses, decimais com ponto ou vírgula e as funções
// sqrt, abs, round(x, casas), min, max, floor, ceil.

type Token = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'fn'; v: string } | { t: '('} | { t: ')' } | { t: ',' }

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
  round: (x: number, casas = 0) => {
    const f = Math.pow(10, casas)
    return Math.round(x * f) / f
  },
}

function tokenize(input: string): Token[] {
  const s = input.replace(/\s+/g, '').replace(/(\d),(\d)/g, '$1.$2')
  const out: Token[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < s.length && /[0-9.eE]/.test(s[j])) j++
      const v = Number(s.slice(i, j))
      if (Number.isNaN(v)) throw new Error(`Número inválido: ${s.slice(i, j)}`)
      out.push({ t: 'num', v })
      i = j
    } else if (/[a-z]/i.test(c)) {
      let j = i
      while (j < s.length && /[a-z]/i.test(s[j])) j++
      const name = s.slice(i, j).toLowerCase()
      if (name === 'pi') out.push({ t: 'num', v: Math.PI })
      else if (FUNCS[name]) out.push({ t: 'fn', v: name })
      else throw new Error(`Função desconhecida: ${name}`)
      i = j
    } else if ('+-*/^%'.includes(c)) {
      const prev = out[out.length - 1]
      const unary = c === '-' && (!prev || prev.t === 'op' || prev.t === '(' || prev.t === ',')
      out.push({ t: 'op', v: unary ? 'neg' : c })
      i++
    } else if (c === '(') { out.push({ t: '(' }); i++ }
    else if (c === ')') { out.push({ t: ')' }); i++ }
    else if (c === ',' || c === ';') { out.push({ t: ',' }); i++ }
    else throw new Error(`Caractere inválido: ${c}`)
  }
  return out
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3, neg: 4 }
const RIGHT = new Set(['^', 'neg'])

export function calcular(expr: string): number {
  if (!expr || expr.length > 500) throw new Error('Expressão vazia ou longa demais')
  const tokens = tokenize(expr)
  const output: (Token | { t: 'call'; v: string; n: number })[] = []
  const ops: (Token & { argc?: number })[] = []
  const argCounts: number[] = []

  for (const tk of tokens) {
    if (tk.t === 'num') output.push(tk)
    else if (tk.t === 'fn') { ops.push(tk); argCounts.push(1) }
    else if (tk.t === ',') {
      while (ops.length && ops[ops.length - 1].t !== '(') output.push(ops.pop()!)
      if (argCounts.length) argCounts[argCounts.length - 1]++
    } else if (tk.t === 'op') {
      while (ops.length) {
        const top = ops[ops.length - 1]
        if (top.t !== 'op') break
        const p1 = PREC[tk.v], p2 = PREC[top.v]
        if (p2 > p1 || (p2 === p1 && !RIGHT.has(tk.v))) output.push(ops.pop()!)
        else break
      }
      ops.push(tk)
    } else if (tk.t === '(') ops.push(tk)
    else if (tk.t === ')') {
      while (ops.length && ops[ops.length - 1].t !== '(') output.push(ops.pop()!)
      if (!ops.length) throw new Error('Parênteses desbalanceados')
      ops.pop()
      if (ops.length && ops[ops.length - 1].t === 'fn') {
        const fn = ops.pop() as { t: 'fn'; v: string }
        output.push({ t: 'call', v: fn.v, n: argCounts.pop() || 1 })
      }
    }
  }
  while (ops.length) {
    const op = ops.pop()!
    if (op.t === '(') throw new Error('Parênteses desbalanceados')
    output.push(op)
  }

  const stack: number[] = []
  for (const tk of output) {
    if (tk.t === 'num') stack.push(tk.v)
    else if (tk.t === 'call') {
      const args = stack.splice(stack.length - tk.n, tk.n)
      stack.push(FUNCS[tk.v](...args))
    } else if (tk.t === 'op') {
      if (tk.v === 'neg') { stack.push(-(stack.pop() as number)); continue }
      const b = stack.pop() as number, a = stack.pop() as number
      if (a === undefined || b === undefined) throw new Error('Expressão incompleta')
      switch (tk.v) {
        case '+': stack.push(a + b); break
        case '-': stack.push(a - b); break
        case '*': stack.push(a * b); break
        case '/': if (b === 0) throw new Error('Divisão por zero'); stack.push(a / b); break
        case '%': stack.push(a % b); break
        case '^': stack.push(Math.pow(a, b)); break
      }
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error('Expressão inválida')
  return stack[0]
}
