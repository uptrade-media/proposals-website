import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from '@dr.pogodin/react-helmet'
import HomePage from './pages/HomePage'
import MBFMPage from './pages/MBFMPage'
import './App.css'

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mbfm" element={<MBFMPage />} />
          </Routes>
        </div>
      </Router>
    </HelmetProvider>
  )
}

export default App
