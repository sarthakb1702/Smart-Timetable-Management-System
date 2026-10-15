'use client'

import React from 'react'
import { GenerateSolverPanel } from '../../../../components/timetable/GenerateSolverPanel'

export default function GeneratePage() {
  return (
    <GenerateSolverPanel
      editPath="/dept-tt-coordinator/edit"
      approvePath="/dept-tt-coordinator/approve"
    />
  )
}
