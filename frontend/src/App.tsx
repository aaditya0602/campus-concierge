import BusCard from './components/BusCard'
import DiningCard from './components/DiningCard'
import EventsCard from './components/EventsCard'
import AssistantPanel from './components/AssistantPanel'

function App() {
  return (
    <div className="min-h-screen bg-neutral-100 pb-24 dark:bg-neutral-950">
      <header className="bg-vt-maroon px-4 py-4 text-white shadow-md sm:px-6">
        <h1 className="text-xl font-bold sm:text-2xl">Campus Concierge</h1>
        <p className="text-xs text-white/80 sm:text-sm">Your unofficial guide to Virginia Tech</p>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <BusCard />
          <DiningCard />
          <EventsCard />
        </div>
      </main>

      <AssistantPanel />
    </div>
  )
}

export default App
