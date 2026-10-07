import { useEffect, useState } from 'react'
import Hero from '../../components/home/Hero/Hero.jsx'
import Stats from '../../components/home/Stats/Stats.jsx'
import Categories from '../../components/home/Categories/Categories.jsx'
import FeaturedModels from '../../components/home/FeaturedModels/FeaturedModels.jsx'
import ServicesPreview from '../../components/home/ServicesPreview/ServicesPreview.jsx'
import CoursesPreview from '../../components/home/CoursesPreview/CoursesPreview.jsx'
import WhyChooseUs from '../../components/home/WhyChooseUs/WhyChooseUs.jsx'
import Testimonials from '../../components/home/Testimonials/Testimonials.jsx'
import FAQ from '../../components/home/FAQ/FAQ.jsx'
import ContactCTA from '../../components/home/ContactCTA/ContactCTA.jsx'
import { getPublicHomepageContent, getPublicSiteSettings } from '../../services/siteContentService.js'
import './Home.css'

const defaultHomeData = {
  heroTitle: 'Learn CAD. Design with confidence.',
  heroSubtitle: 'Practical engineering training, CAD models, and expert support for students and businesses.',
  heroPrimaryCtaLabel: 'Explore Courses',
  heroPrimaryCtaLink: '/courses',
  heroSecondaryCtaLabel: 'Contact Us',
  heroSecondaryCtaLink: '/contact',
  stats: ['2000+ learners', '40+ CAD courses', '15+ design categories'],
  featureHighlights: ['Structured Learning', 'Industry-specific CAD guidance', 'Project-focused support']
}

function Home() {
  const [homeData, setHomeData] = useState(defaultHomeData)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      getPublicHomepageContent(),
      getPublicSiteSettings()
    ]).then(([homeResponse, settingsResponse]) => {
      if (!active) return
      const nextHome = homeResponse?.homepage || defaultHomeData
      const nextSettings = settingsResponse?.settings || null
      setHomeData(nextHome)
      setSettings(nextSettings)
    }).catch(() => {
      if (!active) return
      setHomeData(defaultHomeData)
      setSettings(null)
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [])

  return (
    <main>
      <Hero content={homeData} settings={settings} loading={loading} />
      <Stats content={homeData.stats || defaultHomeData.stats} />
      <Categories />
      <FeaturedModels />
      <ServicesPreview />
      <CoursesPreview />
      <WhyChooseUs features={homeData.featureHighlights || defaultHomeData.featureHighlights} />
      <Testimonials />
      <FAQ />
      <ContactCTA />
    </main>
  )
}

export default Home