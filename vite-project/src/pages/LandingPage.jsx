import LandingNavbar from './landing/LandingNavbar'
import LandingHero from './landing/LandingHero'
import LandingStats from './landing/LandingStats'
import LandingHowItWorks from './landing/LandingHowItWorks'
import LandingFeatures from './landing/LandingFeatures'
import LandingRWASection from './landing/LandingRWASection'
import LandingChainStrip from './landing/LandingChainStrip'
import LandingDevSection from './landing/LandingDevSection'
import LandingSafetySection from './landing/LandingSafetySection'
import LandingTestimonials from './landing/LandingTestimonials'
import LandingCTASection from './landing/LandingCTASection'
import LandingFooter from './landing/LandingFooter'

export default function LandingPage() {
  return (
    <div className="bg-surface-950 text-white overflow-x-hidden">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingRWASection />
        <LandingChainStrip />
        <LandingDevSection />
        <LandingSafetySection />
        <LandingTestimonials />
        <LandingCTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
