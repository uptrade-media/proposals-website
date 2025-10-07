import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import LogoPng from '../assets/logo.png'

const Navigation = () => {
  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center">
              <img src={LogoPng} alt="Uptrade Media" className="h-8" />
            </Link>
          </div>

          <div className="flex items-center space-x-4">

            <motion.div
              className="inline-block group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Button
                asChild
                aria-label="Contact"
                className="relative isolate overflow-hidden rounded-md bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] text-white shadow-lg transition-shadow duration-300 group-hover:shadow-2xl transform-gpu [backface-visibility:hidden] focus-visible:ring-2 focus-visible:ring-[#4bbf39]"
              >
                <a href="https://www.uptrademedia.com/contact">Contact</a>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navigation
