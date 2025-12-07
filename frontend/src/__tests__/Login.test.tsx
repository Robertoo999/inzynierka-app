import React from 'react'
import { render, screen } from '@testing-library/react'
import LoginPage from '../pages/auth/LoginPage'

describe('LoginPage', () => {
  it('renders email and password inputs', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Hasło|Password/i)).toBeInTheDocument()
  })
})
