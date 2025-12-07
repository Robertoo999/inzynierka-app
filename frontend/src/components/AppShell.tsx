import React from 'react'
import Header from './Header'

export default function AppShell({ children }:{ children:React.ReactNode }){
    return (
        <div className="container">
            <Header />
            <main className="page-content" style={{marginTop:12}}>
                {children}
            </main>
            <hr className="sep" />
            <footer className="text-muted" style={{display:'flex',justifyContent:'space-between'}}>
                <span>© ProLearn</span>
                <span></span>
            </footer>
        </div>
    )
}
