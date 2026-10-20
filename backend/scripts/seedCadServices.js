// DRAFT — prepared for review. NOT executed against the database.
// Run only after approval:  node scripts/seedCadServices.js
//
// Content source: exact "Services – Product Range" copy provided by the client.
// Intro excluded from service records (no intro field exists in CadService model);
// it is page-level content, not per-service content.
//
// Contact details come from the official site (frontend/src/pages/Legal/LegalPage.jsx,
// frontend/src/components/common/CompanyDetails/CompanyDetails.jsx):
//   Email: arvind@cadtechsolution.com
//   Phone/WhatsApp: +91-8839989046  (tel:+918839989046)

import mongoose from 'mongoose'
import { CadService } from '../src/models/CadService.js'
import { connectDatabase } from '../src/config/database.js'

const CONTACT = {
  email: 'arvind@cadtechsolution.com',
  phone: '+91-8839989046'
}

const services = [
  {
    displayOrder: 1,
    title: '3D Printing',
    slug: '3d-printing',
    category: 'Prototyping',
    shortDescription:
      'Rapid prototyping that turns digital 3D models into physical parts.',
    description:
      'We support rapid prototyping and product development by helping turn digital 3D models into physical parts. Our solutions can help evaluate product form, fit, and design concepts before production.',
    features: [],
    deliverables: [],
    supportedSoftware: [],
    thumbnail: null,
    startingPriceInPaise: null,
    estimatedDeliveryDays: null,
    status: 'published'
  },
  {
    displayOrder: 2,
    title: '3D Product Design',
    slug: '3d-product-design',
    category: 'Product Design',
    shortDescription:
      'Detailed 3D CAD models and engineering designs for components, assemblies, and new products.',
    description:
      'We develop detailed 3D CAD models and engineering designs for mechanical components, assemblies, and new product concepts. Our design approach focuses on functionality, accuracy, and manufacturing considerations.',
    features: [],
    deliverables: [],
    supportedSoftware: [],
    thumbnail: null,
    startingPriceInPaise: null,
    estimatedDeliveryDays: null,
    status: 'published'
  },
  {
    displayOrder: 3,
    title: '3D Scanning',
    slug: '3d-scanning',
    category: 'Reverse Engineering',
    shortDescription:
      'Capture physical object geometry for documentation, inspection, and reverse engineering.',
    description:
      "3D scanning can help capture the geometry of physical objects for digital documentation, inspection, and reverse engineering. The appropriate scanning method depends on the object's size, surface, and required accuracy.",
    features: [],
    deliverables: [],
    supportedSoftware: [],
    thumbnail: null,
    startingPriceInPaise: null,
    estimatedDeliveryDays: null,
    status: 'published'
  },
  {
    displayOrder: 4,
    title: 'CNC Machinery Supply',
    slug: 'cnc-machinery-supply',
    category: 'Machinery',
    shortDescription:
      'Explore CNC machinery options matched to your machining and production needs.',
    description:
      'We help customers explore CNC machinery options suited to their machining requirements, production needs, and applications. Equipment specifications and availability should be confirmed for each project.',
    features: [],
    deliverables: [],
    supportedSoftware: [],
    thumbnail: null,
    startingPriceInPaise: null,
    estimatedDeliveryDays: null,
    status: 'published'
  },
  {
    displayOrder: 5,
    title: 'Product Fabrication',
    slug: 'product-fabrication',
    category: 'Fabrication',
    shortDescription:
      'Translate engineering designs into clear, production-ready fabrication requirements.',
    description:
      'We support product realization by helping translate engineering designs into fabrication requirements. Project scope, materials, tolerances, and manufacturing arrangements are confirmed according to customer needs.',
    features: [],
    deliverables: [],
    supportedSoftware: [],
    thumbnail: null,
    startingPriceInPaise: null,
    estimatedDeliveryDays: null,
    status: 'published'
  }
]

// Page-level copy (for Home / Services intro + CTA). Not yet wired to a field.
const pageCopy = {
  introHeading: 'Working Across Industries',
  intro:
    'At CAD Tech Solution, we believe in excellence, quality, and honest engineering. We combine technical expertise with a practical approach to help transform concepts into detailed designs and manufacturing-ready solutions.',
  ctaHeading: 'Have a project in mind?',
  ctaPhone: CONTACT.phone,
  ctaEmail: CONTACT.email
}

export const seedCadServices = async ({ dryRun = true, overwrite = false } = {}) => {
  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`DRY RUN — the following services would be ${overwrite ? 'upserted with OVERWRITE' : 'inserted only if absent'}:`)
    services.forEach((service) => console.log(`  ${service.displayOrder}. ${service.title} (${service.slug})`))
    console.log('Page copy:', pageCopy)
    if (overwrite) {
      // eslint-disable-next-line no-console
      console.warn('WARNING — overwrite mode: existing records matching these slugs will be fully replaced. Admin-edited fields, thumbnails, features, and status may be overwritten.')
    }
    return { services, pageCopy }
  }

  if (overwrite) {
    // eslint-disable-next-line no-console
    console.warn('WARNING — overwrite mode: existing records matching these slugs will be fully replaced. Admin-edited fields, thumbnails, features, and status may be overwritten.')
  }

  await connectDatabase()
  const summary = { inserted: [], skipped: [] }
  for (const service of services) {
    if (overwrite) {
      const result = await CadService.findOneAndUpdate(
        { slug: service.slug },
        { $set: service },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      summary.inserted.push(result?.slug || service.slug)
      continue
    }
    // Safe default: insert-only. Existing documents are never modified.
    const result = await CadService.updateOne(
      { slug: service.slug },
      { $setOnInsert: service },
      { upsert: true, setDefaultsOnInsert: true }
    )
    if (result.upsertedCount > 0) summary.inserted.push(service.slug)
    else summary.skipped.push(service.slug)
  }
  await mongoose.connection.close()
  return { services, pageCopy, summary }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const execute = process.argv.includes('--execute')
  const overwrite = process.argv.includes('--overwrite')
  seedCadServices({ dryRun: !execute, overwrite }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  })
}

export default { services, pageCopy, seedCadServices }
