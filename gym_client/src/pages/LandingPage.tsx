import { MarketingLayout } from '../components/marketing/MarketingLayout'
import { HeroSection } from '../components/marketing/sections/HeroSection'
import { ProgramsSection } from '../components/marketing/sections/ProgramsSection'
import { TrainersSection } from '../components/marketing/sections/TrainersSection'
import { PlansSection } from '../components/marketing/sections/PlansSection'
import { GallerySection } from '../components/marketing/sections/GallerySection'
import { TestimonialsSection } from '../components/marketing/sections/TestimonialsSection'
import { ContactSection } from '../components/marketing/sections/ContactSection'

export function LandingPage() {
  return (
    <MarketingLayout>
      <HeroSection />
      <ProgramsSection />
      <TrainersSection />
      <PlansSection />
      <GallerySection />
      <TestimonialsSection />
      <ContactSection />
    </MarketingLayout>
  )
}
