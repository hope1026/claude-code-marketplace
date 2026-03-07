export class RalphNotImplementedError extends Error {
  constructor(feature: string) {
    super(`${feature} is not implemented yet.`);
    this.name = "RalphNotImplementedError";
  }
}
