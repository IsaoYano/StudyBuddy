import { supabase } from '../lib/supabase'

export default function Dashboard({ session }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-medium text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Log out
          </button>
        </div>
        <p className="text-gray-500 text-sm">
          Logged in as {session.user.email}
        </p>
      </div>
    </div>
  )
}