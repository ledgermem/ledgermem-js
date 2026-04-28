export class LedgerMemError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerMemError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class LedgerMemHTTPError extends LedgerMemError {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(`[${status}] ${message}`)
    this.name = 'LedgerMemHTTPError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class LedgerMemTimeoutError extends LedgerMemError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'LedgerMemTimeoutError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
