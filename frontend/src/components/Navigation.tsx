import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'

const Navigation = () => {
  const { isAuthenticated, logout } = useAuth()

  return (
    <nav className="h-16 border-b bg-white">
      <div className="h-full px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            Rental Cash Flow
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
            <Link href="/search" className="text-gray-600 hover:text-gray-900">
              Search
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link href="/mypage" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                My Page
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700 text-sm font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link 
                href="/signup" 
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Sign Up
              </Link>
              <Link 
                href="/login" 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navigation 