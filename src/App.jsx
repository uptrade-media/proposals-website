// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from '@dr.pogodin/react-helmet'
import MBFMPage from './pages/MBFMPage'
import MBFMLogin from './pages/MBFMLogin'
import Protected from './components/Protected' // <-- add
import './App.css'


export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            <Route path="/" element={<MBFMLogin />} />
            <Route path="/mbfm/login/" element={<MBFMLogin />} />
            <Route
              path="/mbfm"
              element={
                <Protected>
                  <MBFMPage />
                </Protected>
              }
            />
          </Routes>
        </div>
      </Router>
    </HelmetProvider>
  )
}
