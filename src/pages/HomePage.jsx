import { Button } from '@/components/ui/button'
import { Helmet } from '@dr.pogodin/react-helmet'
import Navigation from './Navigation'
import WhiteLogoSvg from '../assets/whitelogo.svg'

const HomePage = () => {
  return (
    <>
      <Helmet>
        <title>Uptrade Media — Unleash Your Brand</title>
        <meta
          name="description"
          content="Unleash your brand with expert marketing, media, and design."
        />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-gradient-to-br from-[#4bbf39] to-[#39bfb0] flex items-center justify-center">
        <section className="text-center text-white px-4 max-w-4xl w-full">
          {/* Logo */}
          <img
            src="/whitelogo.svg"
            alt="Uptrade Media"
            className="h-24 md:h-32 mx-auto mb-8 drop-shadow-lg"
          />

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-10">
            Unleash Your Brand with Expert Marketing, Media, and Design
          </h1>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="w-full sm:w-auto inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/90 hover:text-[#4bbf39] px-8 py-3 transition-all duration-200 shadow-xs"
            >
              <a
                href="https://www.uptrademedia.com/marketing"
                target="_blank"
                rel="noopener noreferrer"
              >
                Marketing
              </a>
            </Button>

            <Button
              size="lg"
              className="w-full sm:w-auto inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/90 hover:text-[#4bbf39] px-8 py-3 transition-all duration-200 shadow-xs"
            >
              <a
                href="https://www.uptrademedia.com/media"
                target="_blank"
                rel="noopener noreferrer"
              >
                Media
              </a>
            </Button>

            <Button
              size="lg"
              className="w-full sm:w-auto inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/90 hover:text-[#4bbf39] px-8 py-3 transition-all duration-200 shadow-xs"
            >
              <a
                href="https://www.uptrademedia.com/design"
                target="_blank"
                rel="noopener noreferrer"
              >
                Design
              </a>
            </Button>
          </div>
        </section>
      </main>
    </>
  )
}

export default HomePage
