export function getCountAnimationConfig(value) {
  const match = String(value).trim().match(/^([-+]?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return { start: 0, end: 0, prefix: '', suffix: '', minimumFractionDigits: 0, maximumFractionDigits: 0 }

  const numericValue = Number(match[1])
  const suffix = match[2] || ''
  const scale = /k/i.test(suffix) ? 1000 : 1
  const hasDecimal = Number.isInteger(numericValue) ? false : !Number.isInteger(Number(match[1]))

  return {
    start: 0,
    end: numericValue * scale,
    prefix: '',
    suffix,
    minimumFractionDigits: hasDecimal ? 1 : 0,
    maximumFractionDigits: hasDecimal ? 1 : 0,
    divider: scale
  }
}

export function formatCountValue(value, number) {
  const config = getCountAnimationConfig(value)
  const displayValue = config.divider === 1 ? number : number / config.divider
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: config.minimumFractionDigits,
    maximumFractionDigits: config.maximumFractionDigits
  }).format(displayValue)

  return `${config.prefix}${formatted}${config.suffix}`
}
