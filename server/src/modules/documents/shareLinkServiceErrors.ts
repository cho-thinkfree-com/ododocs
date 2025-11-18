export class ShareLinkPasswordRequiredError extends Error {
  constructor() {
    super('Share link password required or incorrect')
    this.name = 'ShareLinkPasswordRequiredError'
  }
}

export class ShareLinkEditNotAllowedError extends Error {
  constructor() {
    super('Share link does not allow external editing')
    this.name = 'ShareLinkEditNotAllowedError'
  }
}
