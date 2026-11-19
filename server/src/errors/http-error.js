export class HttpError extends Error {
  constructor(status, code, message, options = {}) {
    super(message, options)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.expose = options.expose ?? status < 500
  }
}
