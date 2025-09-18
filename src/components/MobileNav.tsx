'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export function MobileNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden flex items-center">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-700 hover:text-indigo-600 p-2"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t absolute top-16 left-0 right-0 z-40">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link href="/analytics/dashboard" className="block px-3 py-2 text-gray-700 hover:text-indigo-600">
              Analytics
            </Link>
            <Link href="/demo/dashboard" className="block px-3 py-2 text-gray-700 hover:text-indigo-600">
              Demo
            </Link>
            <Link href="/api/system/health" className="block px-3 py-2 text-gray-700 hover:text-indigo-600">
              System Health
            </Link>
            <Link href="/api/system/monitoring" className="block px-3 py-2 text-gray-700 hover:text-indigo-600">
              Monitoring
            </Link>
          </div>
        </div>
      )}
    </>
  )
}