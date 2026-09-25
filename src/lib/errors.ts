/** Error whose message is safe to show to the user. */
export class UserError extends Error {}

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}
