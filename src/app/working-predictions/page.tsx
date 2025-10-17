import { redirect } from 'next/navigation'

export default function WorkingPredictionsRedirect() {
  // Redirect to the live/working dashboard page
  redirect('/analytics/dashboard')
}
