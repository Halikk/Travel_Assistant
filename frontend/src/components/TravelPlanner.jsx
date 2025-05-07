// src/components/TravelPlanner.jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import PlanView from './PlanView'
import ItineraryPlanner from './ItineraryPlanner'
import {Card, CardContent} from "./ui/card";

export default function TravelPlanner() {
  const [suggestions, setSuggestions] = useState([])
  const [initialLocation, setInitialLocation] = useState(null)
  const [finishLocation, setFinishLocation] = useState(null)
  const [ready, setReady] = useState(false)

  const handlePlan = (sugs, initLoc, finalLoc) => {
    setSuggestions(sugs)
    setInitialLocation(initLoc)
    setFinishLocation(finalLoc)
    setReady(true)
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-5xl mx-auto">
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-8">
            {!ready ? (
              <PlanView onPlan={handlePlan} />
            ) : (
              <ItineraryPlanner
                suggestions={suggestions}
                initialLocation={initialLocation}
                finishLocation={finishLocation}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
