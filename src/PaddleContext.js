import { createContext, useContext, useEffect, useState } from 'react'
import { initializePaddle } from '@paddle/paddle-js'

const PaddleContext = createContext(null)

export function PaddleProvider({ children }) {
  const [paddle, setPaddle] = useState(null)

  useEffect(() => {
    initializePaddle({
      token: process.env.REACT_APP_PADDLE_CLIENT_TOKEN,
      environment: 'production',
    }).then((paddleInstance) => {
      if (paddleInstance) setPaddle(paddleInstance)
    })
  }, [])

  return (
    <PaddleContext.Provider value={paddle}>
      {children}
    </PaddleContext.Provider>
  )
}

export function usePaddle() {
  return useContext(PaddleContext)
}