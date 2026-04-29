export class MnemoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MnemoError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MnemoHTTPError extends MnemoError {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(`[${status}] ${message}`)
    this.name = 'MnemoHTTPError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MnemoTimeoutError extends MnemoError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'MnemoTimeoutError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
