import React, { useState } from 'react'
import PlanView from './PlanView'
import ItineraryPlanner from './ItineraryPlanner'

export default function TravelPlanner() {
  const [suggestions, setSuggestions]         = useState([])
  const [initialLocation, setInitialLocation] = useState(null)
  const [finishLocation, setFinishLocation]   = useState(null)
  const [ready, setReady]                     = useState(false)

  const handlePlan = (sugs, initLoc, finalLoc) => {
    setSuggestions(sugs)
    setInitialLocation(initLoc)
    setFinishLocation(finalLoc)
    setReady(true)
  }

  // Hazır değilken PlanView
  if (!ready) {
    return <PlanView onPlan={handlePlan}/>
  }

  // Hazırsa önerileri ItineraryPlanner’da göster
  return (
    <ItineraryPlanner
      suggestions={suggestions}
      initialLocation={initialLocation}
      finishLocation={finishLocation}
    />
  )
}
