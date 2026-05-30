import { MarketingLayout } from '../components/marketing/MarketingLayout'
import { HeroSection } from '../components/marketing/sections/HeroSection'
import { FeaturesSection } from '../components/marketing/sections/FeaturesSection'
import { PlansSection } from '../components/marketing/sections/PlansSection'
import { TrainersSection } from '../components/marketing/sections/TrainersSection'
import { GallerySection } from '../components/marketing/sections/GallerySection'
import { FacilitySection } from '../components/marketing/sections/FacilitySection'
import { MobileAppSection } from '../components/marketing/sections/MobileAppSection'
import { TestimonialsSection } from '../components/marketing/sections/TestimonialsSection'
import { ContactSection } from '../components/marketing/sections/ContactSection'

/**
 * Tiger Fitness — public marketing landing page.
 * Order is intentional: hook → proof of features → pricing → people → results
 *  → environment → app → social proof → conversion.
 */
export function LandingPage() {
  return (
    <MarketingLayout>
      <HeroSection />
      <FeaturesSection />
      <PlansSection />
      <TrainersSection />
      <GallerySection />
      <FacilitySection />
      <MobileAppSection />
      <TestimonialsSection />
      <ContactSection />
    </MarketingLayout>
  )
}
