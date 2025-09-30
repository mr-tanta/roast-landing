'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { AuthModal } from '@/components/auth/auth-modal'
import { Button } from '@/components/ui/button'
import { 
  User, 
  LogOut, 
  Settings, 
  CreditCard,
  BarChart3,
  Menu,
  X
} from 'lucide-react'

export function Header() {
  const { user, signOut } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-sm font-bold">R</span>
            </div>
            <span className="hidden font-bold sm:inline-block">
              RoastMyLanding
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Home
            </Link>
            <Link 
              href="/pricing" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Pricing
            </Link>
            {user && (
              <Link 
                href="/dashboard" 
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Dashboard
              </Link>
            )}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                </Button>

                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border bg-popover p-1 shadow-md">
                      <div className="px-2 py-1.5 text-sm font-semibold">
                        {user.user_metadata?.name || user.email}
                      </div>
                      <div className="h-px bg-border my-1" />
                      
                      <Link 
                        href="/dashboard"
                        className="flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                      
                      <Link 
                        href="/settings"
                        className="flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                      
                      <Link 
                        href="/billing"
                        className="flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Billing
                      </Link>
                      
                      <div className="h-px bg-border my-1" />
                      
                      <button
                        className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setDropdownOpen(false)
                          signOut()
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t md:hidden">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <nav className="flex flex-col space-y-2">
                <Link 
                  href="/" 
                  className="text-sm font-medium py-2 hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-sm font-medium py-2 hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                {user && (
                  <Link 
                    href="/dashboard" 
                    className="text-sm font-medium py-2 hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
              </nav>

              <div className="pt-4 border-t">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold py-2">
                      {user.user_metadata?.name || user.email}
                    </div>
                    <Link 
                      href="/settings"
                      className="flex items-center text-sm py-2 hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                    <Link 
                      href="/billing"
                      className="flex items-center text-sm py-2 hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                    <button
                      className="flex items-center text-sm py-2 hover:text-primary w-full text-left"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        signOut()
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        setIsAuthModalOpen(true)
                      }}
                    >
                      Sign In
                    </Button>
                    <Button 
                      className="justify-start"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        setIsAuthModalOpen(true)
                      }}
                    >
                      Get Started
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab="signup"
      />
    </>
  )
}