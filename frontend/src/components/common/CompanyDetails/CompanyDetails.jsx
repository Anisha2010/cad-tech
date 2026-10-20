import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getPublicSiteSettings } from '../../../services/siteContentService.js'
import './CompanyDetails.css'

const fallbacks = {
  address: 'Shalimar Sterling, Bhopal, Madhya Pradesh, India',
  phone: '+91 8839989046',
  email: 'arvind@cadtechsolution.com',
  workingHours: 'Monday–Saturday, 9:00 AM–6:00 PM'
}

const telHref = (phone) => `tel:${phone.replace(/[^+\d]/g, '')}`

function CompanyDetails({ settings, variant = 'panel' }) {
  const [ownSettings, setOwnSettings] = useState(null)
  const shouldFetch = settings === undefined

  useEffect(() => {
    if (!shouldFetch) return undefined
    let active = true
    getPublicSiteSettings().then((response) => {
      if (active) setOwnSettings(response?.settings || null)
    }).catch(() => {
      if (active) setOwnSettings(null)
    })
    return () => { active = false }
  }, [shouldFetch])

  const data = shouldFetch ? ownSettings : settings
  const phone = data?.contactPhone || fallbacks.phone
  const email = data?.contactEmail || fallbacks.email

  const rows = [
    { icon: MapPin, label: 'Address', value: data?.contactAddress || fallbacks.address },
    { icon: Phone, label: 'Phone', value: phone, href: telHref(phone) },
    { icon: Mail, label: 'Email', value: email, href: `mailto:${email}` },
    { icon: Clock, label: 'Working Hours', value: data?.contactWorkingHours || fallbacks.workingHours }
  ]

  return (
    <ul className={`company-details company-details-${variant}`}>
      {rows.map(({ icon: Icon, label, value, href }) => (
        <li className="company-details-item" key={label}>
          <span className="company-details-icon" aria-hidden="true"><Icon size={17} /></span>
          <span className="company-details-copy">
            <span className="company-details-label">{label}</span>
            {href
              ? <a className="company-details-value" href={href}>{value}</a>
              : <span className="company-details-value">{value}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default CompanyDetails
