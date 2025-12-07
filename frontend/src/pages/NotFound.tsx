import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound(){
    return (
        <div className="card">
            <h3 className="section-title">404 — Nie znaleziono</h3>
            <p className="text-muted">Wygląda na to, że strona nie istnieje.</p>
            <Link to="/">Powrót do strony głównej</Link>
        </div>
    )
}
