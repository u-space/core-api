export type AccessAndRefreshToken = {
  accessToken: string;
  refreshToken: string;
};

export type AuthServerSession = {
  id: string;
  userId: string;
  refreshToken: string;
};

export type AuthServerUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  verified: boolean;
  disabled?: boolean;
  sessions?: AuthServerSession[];
};

// ----------------------------------------------------------------
// ------------------------- Error Types  -------------------------
// ----------------------------------------------------------------

export class AlreadyDataError extends Error {
  constructor(m: string) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AlreadyDataError.prototype);
  }
}

export class CorruptedDataError extends Error {
  constructor(m: string) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AlreadyDataError.prototype);
  }
}

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
