export class FormError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}
