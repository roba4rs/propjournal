import { createContext, useContext, useEffect, useState } from 'react'
import { initializePaddle } from '@paddle/paddle-js'

const PaddleContext = createContext(null)

const IS_SANDBOX = process.env.REACT_APP_PADDLE_ENV === 'sandbox'

const PADDLE_CLIENT_TOKEN = IS_SANDBOX
  ? process.env.REACT_APP_PADDLE_CLIENT_TOKEN_SANDBOX
  : process.env.REACT_APP_PADDLE_CLIENT_TOKEN

const PADDLE_ENVIRONMENT = IS_SANDBOX ? 'sandbox' : 'production'

export function PaddleProvider({ children }) {
  const [paddle, setPaddle] = useState(null)

  useEffect(() => {
    initializePaddle({
      token: PADDLE_CLIENT_TOKEN,
      environment: PADDLE_ENVIRONMENT,
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