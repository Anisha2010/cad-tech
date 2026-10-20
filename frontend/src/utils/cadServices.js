import { Box, Building2, Cuboid, Factory, Layers3, PenTool, Printer, Settings, Zap } from 'lucide-react'
import staticServices from '../data/services.js'

const iconRules = [
  { match: /(3d|model|modeling|modelling)/i, icon: Cuboid },
  { match: /(architect|building|floor|layout|structure)/i, icon: Building2 },
  { match: /(print|proto|rapid)/i, icon: Printer },
  { match: /(manufactur|cnc|machin|production|factory)/i, icon: Factory },
  { match: /(draft|drawing|documentation|detail)/i, icon: PenTool },
  { match: /(assembly|sheet.?metal|fabrication)/i, icon: Layers3 },
  { match: /(product|concept|design)/i, icon: Box }
]

const pickIcon = (service, index = 0) => {
  const haystack = `${service.title || ''} ${service.category || ''}`
  const rule = iconRules.find((entry) => entry.match.test(haystack))
  return rule ? rule.icon : [Settings, Box, PenTool, Cuboid, Building2, Zap][index % 6]
}

export const mapCadServiceToCard = (service, index = 0) => ({
  id: service.id || service._id || service.slug,
  title: typeof service.title === 'string' ? service.title.trim() : '',
  slug: typeof service.slug === 'string' ? service.slug.trim() : '',
  category: typeof service.category === 'string' ? service.category.trim() : 'General CAD',
  description: (typeof service.shortDescription === 'string' && service.shortDescription.trim())
    || (typeof service.description === 'string' ? service.description.trim() : ''),
  shortDescription: (typeof service.shortDescription === 'string' && service.shortDescription.trim())
    || (typeof service.description === 'string' ? service.description.trim() : ''),
  features: Array.isArray(service.features) ? service.features.map((entry) => String(entry).trim()).filter(Boolean) : [],
  deliverables: Array.isArray(service.deliverables) ? service.deliverables.map((entry) => String(entry).trim()).filter(Boolean) : [],
  supportedSoftware: Array.isArray(service.supportedSoftware) ? service.supportedSoftware.map((entry) => String(entry).trim()).filter(Boolean) : [],
  thumbnail: typeof service.thumbnail === 'string' && service.thumbnail.trim() ? service.thumbnail.trim() : null,
  startingPriceInPaise: Number.isInteger(service.startingPriceInPaise) ? service.startingPriceInPaise : null,
  estimatedDeliveryDays: Number.isInteger(service.estimatedDeliveryDays) ? service.estimatedDeliveryDays : null,
  displayOrder: Number.isInteger(service.displayOrder) ? service.displayOrder : 0,
  icon: pickIcon(service, index)
})

export const mapCadServices = (services = []) => (Array.isArray(services) ? services : []).map(mapCadServiceToCard).filter((service) => service.title && service.slug)

export const findStaticService = (slug) => staticServices.find((service) => service.slug === slug) || null

export const getServiceBySlug = async (slug) => {
  if (!slug) return findStaticService(slug)
  try {
    const { getCadServiceBySlug } = await import('../services/cadService.js')
    const service = await getCadServiceBySlug(slug)
    if (service && service.title) return mapCadServiceToCard(service)
  } catch {
    // fall through to static data
  }
  return findStaticService(slug)
}

export const getServicesForDisplay = async (params = {}) => {
  try {
    const { getCadServices } = await import('../services/cadService.js')
    const services = mapCadServices(await getCadServices(params))
    if (services.length > 0) return services
  } catch {
    // fall through to static data
  }
  return staticServices.map(mapCadServiceToCard)
}

export default { mapCadServiceToCard, mapCadServices, findStaticService, getServiceBySlug, getServicesForDisplay }
