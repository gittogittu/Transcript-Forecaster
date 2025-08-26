import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginButton } from "@/components/auth/login-button"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access the Transcript Analytics Platform
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginButton 
              provider="auth0" 
              className="w-full"
              callbackUrl="/dashboard"
            />
            <LoginButton 
              provider="google" 
              className="w-full"
              callbackUrl="/dashboard"
            />
            <LoginButton 
              provider="github" 
              className="w-full"
              callbackUrl="/dashboard"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}