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
import './Home.css'

function Home() {
  return (
    <main>
      <Hero />
      <Stats />
      <Categories />
      <FeaturedModels />
      <ServicesPreview />
      <CoursesPreview />
      <WhyChooseUs />
      <Testimonials />
      <FAQ />
      <ContactCTA />
    </main>
  )
}

export default Home