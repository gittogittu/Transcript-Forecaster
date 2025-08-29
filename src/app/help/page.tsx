'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MainLayout } from '@/components/layout/main-layout'
import { 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Mail, 
  ExternalLink,
  Search,
  BarChart3,
  Database,
  TrendingUp,
  Settings,
  Users,
  Shield
} from 'lucide-react'
import Link from 'next/link'

const helpCategories = [
  {
    title: "Getting Started",
    icon: Book,
    description: "Learn the basics of using the platform",
    articles: [
      { title: "Platform Overview", href: "/help/overview" },
      { title: "First Time Setup", href: "/help/setup" },
      { title: "Navigation Guide", href: "/help/navigation" },
      { title: "User Roles & Permissions", href: "/help/roles" }
    ]
  },
  {
    title: "Analytics & Reports",
    icon: BarChart3,
    description: "Understanding your data and insights",
    articles: [
      { title: "Reading Analytics Dashboard", href: "/help/analytics" },
      { title: "Generating Reports", href: "/help/reports" },
      { title: "Exporting Data", href: "/help/export" },
      { title: "Custom Filters", href: "/help/filters" }
    ]
  },
  {
    title: "Predictions",
    icon: TrendingUp,
    description: "AI-powered forecasting features",
    articles: [
      { title: "Understanding Predictions", href: "/help/predictions" },
      { title: "Gemini AI Integration", href: "/help/gemini" },
      { title: "Confidence Intervals", href: "/help/confidence" },
      { title: "Model Types", href: "/help/models" }
    ]
  },
  {
    title: "Data Management",
    icon: Database,
    description: "Managing your transcript data",
    articles: [
      { title: "Importing Data", href: "/help/import" },
      { title: "Data Validation", href: "/help/validation" },
      { title: "Google Sheets Integration", href: "/help/sheets" },
      { title: "Data Quality", href: "/help/quality" }
    ]
  },
  {
    title: "Administration",
    icon: Shield,
    description: "Admin features and user management",
    articles: [
      { title: "User Management", href: "/help/user-management" },
      { title: "System Settings", href: "/help/system-settings" },
      { title: "Performance Monitoring", href: "/help/monitoring" },
      { title: "Security Features", href: "/help/security" }
    ]
  }
]

const quickActions = [
  {
    title: "Contact Support",
    description: "Get help from our support team",
    icon: MessageCircle,
    action: "mailto:support@transcriptanalytics.com",
    variant: "default" as const
  },
  {
    title: "Feature Request",
    description: "Suggest new features or improvements",
    icon: Mail,
    action: "mailto:feedback@transcriptanalytics.com",
    variant: "outline" as const
  },
  {
    title: "Documentation",
    description: "View complete documentation",
    icon: ExternalLink,
    action: "/docs",
    variant: "outline" as const
  }
]

export default function HelpPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground mt-2">
            Find answers to your questions and learn how to use the platform effectively
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Card key={action.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{action.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {action.description}
                  </p>
                  <Button 
                    variant={action.variant} 
                    size="sm" 
                    className="w-full"
                    asChild
                  >
                    <Link href={action.action}>
                      Get Help
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Help Categories */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {helpCategories.map((category) => {
            const Icon = category.icon
            return (
              <Card key={category.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{category.title}</span>
                  </CardTitle>
                  <CardDescription>
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.articles.map((article) => (
                      <Link
                        key={article.title}
                        href={article.href}
                        className="block p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{article.title}</span>
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HelpCircle className="h-5 w-5" />
              <span>Frequently Asked Questions</span>
            </CardTitle>
            <CardDescription>
              Common questions and answers about the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">How do I import my transcript data?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You can import data through Google Sheets integration or by uploading CSV files directly. 
                  Visit the Data Management section for detailed instructions.
                </p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">What prediction models are available?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  We offer Linear, Polynomial, and ARIMA models powered by Gemini AI for intelligent 
                  context-aware predictions with natural language reasoning.
                </p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">How do I change my user role?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  User roles can only be changed by administrators. Contact your system admin or 
                  support team to request a role change.
                </p>
              </div>
              
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold">Can I export my analytics data?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Yes, you can export data in CSV and PDF formats from the Analytics section. 
                  Different export options are available based on your user role.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Still Need Help?</CardTitle>
            <CardDescription>
              Our support team is here to help you succeed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">Email Support</h4>
                <p className="text-sm text-muted-foreground">
                  Get help via email within 24 hours
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="mailto:support@transcriptanalytics.com">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Support
                  </Link>
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Documentation</h4>
                <p className="text-sm text-muted-foreground">
                  Comprehensive guides and API documentation
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/docs">
                    <Book className="mr-2 h-4 w-4" />
                    View Docs
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}