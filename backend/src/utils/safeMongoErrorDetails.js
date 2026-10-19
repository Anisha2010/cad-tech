const SAFE_ERROR_NAME = /^[A-Za-z][A-Za-z0-9]{0,63}$/

export const getSafeMongoErrorDetails = (error) => {
  const details = {
    errorName: typeof error?.name === 'string' && SAFE_ERROR_NAME.test(error.name)
      ? error.name
      : 'MongoError'
  }
  if (Number.isSafeInteger(error?.code)) details.errorCode = error.code
  return details
}
