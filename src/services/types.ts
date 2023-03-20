export class InvalidDataError extends Error {
  constructor(m: string) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, InvalidDataError.prototype);
  }
}

export class NoDataError extends Error {
  constructor(m: string) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, NoDataError.prototype);
  }
}

export class UnexpectedError extends Error {
  constructor(m: string) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, UnexpectedError.prototype);
  }
}
